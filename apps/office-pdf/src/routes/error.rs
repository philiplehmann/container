use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use utoipa::ToSchema;

/// The body of every error response.
#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorBody {
  /// What went wrong.
  #[schema(example = "unsupported input format `exe`")]
  pub error: String,
}

pub fn error(status: StatusCode, message: &str) -> Response {
  (
    status,
    axum::Json(ErrorBody {
      error: message.to_string(),
    }),
  )
    .into_response()
}
