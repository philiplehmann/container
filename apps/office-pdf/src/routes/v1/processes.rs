//! `/processes`: the conversions of this server (unoserver's process endpoints, always available).

use std::time::Duration;

use axum::Json;
use axum::extract::rejection::QueryRejection;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::AppState;
use crate::jobs::{JobInfo, JobStatus, JobSummary, Signal};
use crate::routes::error::{ErrorBody, error};

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ListQuery {
  /// Only conversions with this status.
  pub status: Option<JobStatus>,
}

#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
#[into_params(parameter_in = Query)]
pub struct ClearQuery {
  /// Only clear conversions that ended at least this many milliseconds ago.
  pub older_than: Option<u64>,
}

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct KillQuery {
  /// Accepted for unoserver compatibility: every signal stops the conversion the same way.
  #[serde(default)]
  #[param(inline)]
  pub signal: Signal,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct JobList {
  pub processes: Vec<JobInfo>,
  pub summary: JobSummary,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Cleared {
  /// How many conversions were removed.
  pub cleared: usize,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Killed {
  pub success: bool,
  pub process: JobInfo,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotRunning {
  #[schema(example = "Process is not running")]
  pub error: String,
  pub process: JobInfo,
}

fn query_error(e: QueryRejection) -> Response {
  error(e.status(), &e.body_text())
}

/// Path ids that are not UUIDs don't exist either (unoserver matches the route by UUID).
fn not_found() -> Response {
  error(StatusCode::NOT_FOUND, "Process not found")
}

/// List conversions, oldest first, with a count per status.
#[utoipa::path(
    get,
    path = "/processes",
    tag = "processes",
    operation_id = "listProcesses",
    params(ListQuery),
    responses(
        (status = 200, description = "Conversions", body = JobList),
        (status = 400, description = "Invalid status", body = ErrorBody),
    ),
)]
pub async fn list(State(state): State<AppState>, query: Result<Query<ListQuery>, QueryRejection>) -> Response {
  let Query(query) = match query {
    Ok(q) => q,
    Err(e) => return query_error(e),
  };
  Json(JobList {
    processes: state.jobs.list(query.status),
    summary: state.jobs.summary(),
  })
  .into_response()
}

/// Remove finished (completed, failed, killed) conversions from the list.
#[utoipa::path(
    delete,
    path = "/processes",
    tag = "processes",
    operation_id = "clearProcesses",
    params(ClearQuery),
    responses(
        (status = 200, description = "Removed", body = Cleared),
        (status = 400, description = "Invalid olderThan", body = ErrorBody),
    ),
)]
pub async fn clear(State(state): State<AppState>, query: Result<Query<ClearQuery>, QueryRejection>) -> Response {
  let Query(query) = match query {
    Ok(q) => q,
    Err(e) => return query_error(e),
  };
  Json(Cleared {
    cleared: state.jobs.clear(query.older_than.map(Duration::from_millis)),
  })
  .into_response()
}

/// One conversion.
#[utoipa::path(
    get,
    path = "/processes/{id}",
    tag = "processes",
    operation_id = "getProcess",
    params(("id" = String, Path, format = "uuid", description = "Conversion id")),
    responses(
        (status = 200, description = "The conversion", body = JobInfo),
        (status = 404, description = "No such conversion", body = ErrorBody),
    ),
)]
pub async fn get(State(state): State<AppState>, Path(id): Path<String>) -> Response {
  match Uuid::parse_str(&id).ok().and_then(|id| state.jobs.get(id)) {
    Some(job) => Json(job).into_response(),
    None => not_found(),
  }
}

/// Kill a running conversion: its request is answered with an error and it is listed as killed.
#[utoipa::path(
    delete,
    path = "/processes/{id}",
    tag = "processes",
    operation_id = "killProcess",
    params(("id" = String, Path, format = "uuid", description = "Conversion id"), KillQuery),
    responses(
        (status = 200, description = "Killed", body = Killed),
        (status = 400, description = "Not running, or invalid signal", body = NotRunning),
        (status = 404, description = "No such conversion", body = ErrorBody),
    ),
)]
pub async fn kill(
  State(state): State<AppState>,
  Path(id): Path<String>,
  query: Result<Query<KillQuery>, QueryRejection>,
) -> Response {
  let Some(job) = Uuid::parse_str(&id).ok().and_then(|id| state.jobs.get(id)) else {
    return not_found();
  };
  let Query(query) = match query {
    Ok(q) => q,
    Err(e) => return query_error(e),
  };
  if job.status != JobStatus::Running {
    return (
      StatusCode::BAD_REQUEST,
      Json(NotRunning {
        error: "Process is not running".into(),
        process: job,
      }),
    )
      .into_response();
  }
  let success = state.jobs.kill(job.id, query.signal);
  let process = state.jobs.get(job.id).unwrap_or(job);
  let status = if success {
    StatusCode::OK
  } else {
    StatusCode::INTERNAL_SERVER_ERROR
  };
  (status, Json(Killed { success, process })).into_response()
}
