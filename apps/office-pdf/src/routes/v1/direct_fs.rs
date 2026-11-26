//! `/direct-fs`: convert a file below `FS_INPUT_ROOT` into a file below `FS_OUTPUT_ROOT`
//! (unoserver's `/direct-fs`, always available).

use std::path::{Component, Path, PathBuf};
use std::time::Instant;

use axum::Json;
use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::run;
use crate::AppState;
use crate::convert::{ConvertRequest, OutputType};

/// One value or several.
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[serde(untagged)]
pub enum OneOrMany {
  One(String),
  Many(Vec<String>),
}

impl OneOrMany {
  fn into_vec(self) -> Vec<String> {
    match self {
      OneOrMany::One(s) => vec![s],
      OneOrMany::Many(v) => v,
    }
  }
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DirectFsRequest {
  /// Input file, relative to `FS_INPUT_ROOT`.
  #[schema(example = "reports/q1.docx", min_length = 1)]
  pub input_path: String,
  /// Output file, relative to `FS_OUTPUT_ROOT`; missing folders are created.
  #[schema(example = "reports/q1.pdf", min_length = 1)]
  pub output_path: String,
  /// Output type. Defaults to the output filter's type, else pdf.
  pub convert_to: Option<OutputType>,
  /// LibreOffice export filter name.
  pub output_filter: Option<String>,
  /// Filter options, as for `/convert`. Needs `outputFilter`.
  pub filter_options: Option<OneOrMany>,
  /// Stop waiting after this many milliseconds.
  #[schema(minimum = 1)]
  pub timeout_ms: Option<u64>,
  /// Input format by extension; default: detected from the content, then the file extension.
  pub format: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DirectFsComplete {
  /// Always `complete`.
  #[schema(example = "complete")]
  pub status: &'static str,
  pub input_path: String,
  pub output_path: String,
  pub output_bytes: u64,
  pub duration_ms: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DirectFsError {
  /// Always `error`.
  #[schema(example = "error")]
  pub status: &'static str,
  #[schema(example = "Input file not found or not readable")]
  pub message: String,
}

fn fail(status: StatusCode, message: impl Into<String>) -> Response {
  (
    status,
    Json(DirectFsError {
      status: "error",
      message: message.into(),
    }),
  )
    .into_response()
}

/// Convert a file on the server's file system (unoserver `/direct-fs`).
///
/// Paths are relative to `FS_INPUT_ROOT` and `FS_OUTPUT_ROOT`; absolute paths and paths that
/// leave the roots (`..`, symbolic links) are refused. The output is written atomically.
#[utoipa::path(
    post,
    path = "/direct-fs",
    tag = "convert",
    operation_id = "directFs",
    request_body = DirectFsRequest,
    responses(
        (status = 200, description = "Converted", body = DirectFsComplete),
        (status = 400, description = "Invalid request, path outside the roots, input missing, invalid filter", body = DirectFsError),
        (status = 401, description = "Document is password protected", body = DirectFsError),
        (status = 415, description = "Unsupported input format or output type", body = DirectFsError),
        (status = 422, description = "Document can't be read", body = DirectFsError),
        (status = 500, description = "Conversion or write failed", body = DirectFsError),
        (status = 504, description = "Conversion exceeded `timeoutMs`", body = DirectFsError),
    ),
)]
pub async fn direct_fs(State(state): State<AppState>, body: Result<Json<DirectFsRequest>, JsonRejection>) -> Response {
  let body = match body {
    Ok(Json(body)) => body,
    Err(e) => return fail(StatusCode::BAD_REQUEST, e.body_text()),
  };
  if body.input_path.is_empty() || body.output_path.is_empty() {
    return fail(StatusCode::BAD_REQUEST, "inputPath and outputPath are required");
  }
  let filter_options = body.filter_options.map(OneOrMany::into_vec).unwrap_or_default();
  if !filter_options.is_empty() && body.output_filter.is_none() {
    return fail(
      StatusCode::BAD_REQUEST,
      "filterOptions can only be provided when outputFilter is set",
    );
  }
  let timeout = match run::timeout(body.timeout_ms) {
    Ok(t) => t,
    Err(e) => return fail(StatusCode::BAD_REQUEST, e),
  };

  let input = match resolve_under(&state.config.fs_input_root, &body.input_path, "inputPath") {
    Ok(p) => p,
    Err(e) => return fail(StatusCode::BAD_REQUEST, e),
  };
  let output = match resolve_under(&state.config.fs_output_root, &body.output_path, "outputPath") {
    Ok(p) => p,
    Err(e) => return fail(StatusCode::BAD_REQUEST, e),
  };
  let bytes = match read_input(&state.config.fs_input_root, &input, state.config.max_body_bytes).await {
    Ok(b) => b,
    Err(e) => return fail(StatusCode::BAD_REQUEST, e),
  };

  // Without a format the content decides; the file extension is the fallback.
  let format = body.format.or_else(|| {
    crate::convert::detect::sniff(&bytes)
      .is_none()
      .then(|| input.extension().and_then(|e| e.to_str()).map(str::to_string))
      .flatten()
      .filter(|ext| crate::convert::detect::engine_for(&ext.to_ascii_lowercase()).is_some())
  });
  let request = ConvertRequest {
    format,
    convert_to: body.convert_to,
    output_filter: body.output_filter,
    filter_options,
    ..Default::default()
  };

  let started = Instant::now();
  let converted = match run::run(&state, bytes.into(), request, timeout).await {
    Ok(c) => c,
    Err(e) => return fail(e.status(), e.to_string()),
  };
  if let Err(e) = write_output(&state.config.fs_output_root, &output, &input, &converted.bytes).await {
    tracing::error!(error = %e, path = %output.display(), "direct-fs write failed");
    return fail(StatusCode::INTERNAL_SERVER_ERROR, e);
  }
  Json(DirectFsComplete {
    status: "complete",
    input_path: body.input_path,
    output_path: body.output_path,
    output_bytes: converted.bytes.len() as u64,
    duration_ms: started.elapsed().as_millis() as u64,
  })
  .into_response()
}

/// `relative` below `root`, resolved lexically: absolute paths and `..` past the root are refused.
pub fn resolve_under(root: &Path, relative: &str, field: &str) -> Result<PathBuf, String> {
  let path = Path::new(relative);
  if path.is_absolute() || path.has_root() {
    return Err(format!("{field} must be a relative path"));
  }
  let mut resolved = root.to_path_buf();
  for component in path.components() {
    match component {
      Component::Normal(part) => resolved.push(part),
      Component::CurDir => {}
      Component::ParentDir if resolved != root => {
        resolved.pop();
      }
      _ => return Err(format!("{field} must resolve within configured root")),
    }
  }
  Ok(resolved)
}

/// Read the input file; a symbolic link may not lead out of the root.
async fn read_input(root: &Path, input: &Path, limit: usize) -> Result<Vec<u8>, String> {
  let not_found = || "Input file not found or not readable".to_string();
  let real = tokio::fs::canonicalize(input).await.map_err(|_| not_found())?;
  let real_root = tokio::fs::canonicalize(root).await.map_err(|_| not_found())?;
  if !real.starts_with(&real_root) {
    return Err("inputPath must resolve within configured root".into());
  }
  let meta = tokio::fs::metadata(&real).await.map_err(|_| not_found())?;
  if !meta.is_file() {
    return Err("Input path must point to a file".into());
  }
  if meta.len() > limit as u64 {
    return Err(format!("Input file is larger than {limit} bytes"));
  }
  tokio::fs::read(&real).await.map_err(|_| not_found())
}

/// Write `bytes` to `output` through a temporary file and a rename, so readers never see a
/// partial file and concurrent writes to one path don't interleave.
async fn write_output(root: &Path, output: &Path, input: &Path, bytes: &[u8]) -> Result<(), String> {
  let parent = output.parent().ok_or("outputPath has no folder")?;
  tokio::fs::create_dir_all(parent)
    .await
    .map_err(|e| format!("create output folder: {e}"))?;
  let real_parent = tokio::fs::canonicalize(parent).await.map_err(|e| e.to_string())?;
  let real_root = tokio::fs::canonicalize(root).await.map_err(|e| e.to_string())?;
  if !real_parent.starts_with(&real_root) {
    return Err("outputPath must resolve within configured root".into());
  }
  let target = real_parent.join(output.file_name().ok_or("outputPath has no file name")?);
  if tokio::fs::canonicalize(input)
    .await
    .is_ok_and(|real_input| real_input == target)
  {
    return Err("input and output paths must be different".into());
  }
  let temp = real_parent.join(format!(".office-pdf-{}.tmp", uuid::Uuid::new_v4()));
  tokio::fs::write(&temp, bytes)
    .await
    .map_err(|e| format!("write output: {e}"))?;
  if let Err(e) = tokio::fs::rename(&temp, &target).await {
    let _ = tokio::fs::remove_file(&temp).await;
    return Err(format!("write output: {e}"));
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn resolves_paths_under_the_root() {
    let root = Path::new("/data/in");
    assert_eq!(
      resolve_under(root, "a/b.doc", "p").unwrap(),
      Path::new("/data/in/a/b.doc")
    );
    assert_eq!(
      resolve_under(root, "a/../b.doc", "p").unwrap(),
      Path::new("/data/in/b.doc")
    );
    assert!(resolve_under(root, "../outside.doc", "p").is_err());
    assert!(resolve_under(root, "a/../../x", "p").is_err());
    assert!(resolve_under(root, "/etc/passwd", "p").is_err());
  }
}
