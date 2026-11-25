//! Running one conversion as a tracked job, with a timeout and kill support.

use std::time::Duration;

use axum::body::Bytes;
use axum::http::StatusCode;

use crate::AppState;
use crate::convert::{self, ConvertError, ConvertRequest, Converted};
use crate::jobs::Signal;
use crate::pdf::PdfError;

/// An operation's own failure, with the HTTP status it answers with.
pub trait Failure: std::fmt::Display {
  fn status(&self) -> StatusCode;
}

impl Failure for ConvertError {
  fn status(&self) -> StatusCode {
    match self {
      ConvertError::UnsupportedFormat(_) | ConvertError::UnsupportedOutput(_) => StatusCode::UNSUPPORTED_MEDIA_TYPE,
      ConvertError::UnsupportedFilter(_) | ConvertError::InvalidOption(_) => StatusCode::BAD_REQUEST,
      ConvertError::PasswordRequired | ConvertError::WrongPassword => StatusCode::UNAUTHORIZED,
      ConvertError::PasswordUnsupported(_) | ConvertError::Read(_) | ConvertError::Strict(_) => {
        StatusCode::UNPROCESSABLE_ENTITY
      }
      ConvertError::Write(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
  }
}

impl Failure for PdfError {
  fn status(&self) -> StatusCode {
    match self {
      PdfError::Invalid(_) => StatusCode::UNPROCESSABLE_ENTITY,
      PdfError::PasswordRequired | PdfError::WrongPassword => StatusCode::UNAUTHORIZED,
      PdfError::BadRequest(_) => StatusCode::BAD_REQUEST,
      PdfError::Write(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
  }
}

#[derive(Debug, thiserror::Error)]
pub enum RunError {
  #[error("{1}")]
  Failed(StatusCode, String),
  #[error("conversion exceeded timeoutMs and was killed")]
  TimedOut,
  #[error("conversion was killed")]
  Killed,
  #[error("conversion failed")]
  Panicked,
}

impl RunError {
  pub fn status(&self) -> StatusCode {
    match self {
      RunError::Failed(status, _) => *status,
      RunError::TimedOut => StatusCode::GATEWAY_TIMEOUT,
      RunError::Killed | RunError::Panicked => StatusCode::INTERNAL_SERVER_ERROR,
    }
  }
}

/// Convert `bytes` as a job listed under `/processes`.
pub async fn run(
  state: &AppState,
  bytes: Bytes,
  request: ConvertRequest,
  timeout: Option<Duration>,
) -> Result<Converted, RunError> {
  let command = convert::route(&bytes, &request).map_or("office-pdf", |(engine, _)| engine.name());
  let args = request.describe();
  run_task(state, command, args, timeout, move || {
    convert::convert(&bytes, &request)
  })
  .await
}

/// Run `work` as a job listed under `/processes`. It waits for a free slot
/// (`MAX_CONCURRENT_CONVERSIONS`), then runs on a blocking thread; `timeout` (from the request)
/// and `DELETE /processes/{id}` stop waiting for it. The thread itself can't be interrupted: it
/// finishes in the background and keeps its slot until then, so killed jobs can't pile up.
pub async fn run_task<T, E, F>(
  state: &AppState,
  command: &str,
  args: Vec<String>,
  timeout: Option<Duration>,
  work: F,
) -> Result<T, RunError>
where
  T: Send + 'static,
  E: Failure + Send + 'static,
  F: FnOnce() -> Result<T, E> + Send + 'static,
{
  let job = state.jobs.start(command, args);
  let slots = state.conversions.clone();

  let task = async move {
    let permit = slots.acquire_owned().await.map_err(|_| RunError::Killed)?;
    tokio::task::spawn_blocking(move || {
      let _permit = permit;
      work()
    })
    .await
    .map_err(|join| {
      // A panic inside an engine must not take the server down; it only fails this job.
      tracing::error!(error = %join, "job panicked");
      RunError::Panicked
    })?
    .map_err(|e| RunError::Failed(e.status(), e.to_string()))
  };
  let deadline = async {
    match timeout {
      Some(t) => tokio::time::sleep(t).await,
      None => std::future::pending().await,
    }
  };

  let result = tokio::select! {
      result = task => result,
      () = deadline => {
          state.jobs.kill(job.id, Signal::Kill);
          Err(RunError::TimedOut)
      }
      () = job.cancelled() => Err(RunError::Killed),
  };
  state.jobs.finish(job.id, result.is_ok());
  if let Err(e) = &result {
    tracing::warn!(job = %job.id, command, error = %e, "job failed");
  }
  result
}

/// `timeoutMs` as unoserver takes it: a positive number of milliseconds.
pub fn timeout(ms: Option<u64>) -> Result<Option<Duration>, String> {
  match ms {
    Some(0) => Err("timeoutMs must be a positive integer".into()),
    other => Ok(other.map(Duration::from_millis)),
  }
}
