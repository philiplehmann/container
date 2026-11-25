/// Liveness probe: the process is up.
#[utoipa::path(get, path = "/health/liveness", tag = "health", responses((status = 200, description = "ok", body = String, example = "ok")))]
pub async fn liveness() -> &'static str {
  "ok"
}

/// Readiness probe: the server accepts requests.
#[utoipa::path(get, path = "/health/readiness", tag = "health", responses((status = 200, description = "ok", body = String, example = "ok")))]
pub async fn readiness() -> &'static str {
  "ok"
}
