//! office-pdf: one small Rust server for document work. It converts office documents to PDF
//! and images with ArtCraft's engines (in process, no LibreOffice or JVM), with the endpoints of
//! the unoserver image; PDF manipulation (what poppler and pdftk cover in their own containers)
//! is meant to join it here.
//!
//! The API is versioned by path prefix (`/v1/...`); its OpenAPI document is served at
//! `/v1/openapi.json`. The container probes (`/health/*`) are not versioned.

pub mod config;
pub mod convert;
pub mod jobs;
pub mod pdf;
mod routes;

use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use tokio::sync::Semaphore;
use tower_http::trace::TraceLayer;

pub use config::Config;
pub use routes::v1::convert::PASSWORD_HEADER;

#[derive(Clone)]
pub struct AppState {
  pub config: Arc<Config>,
  /// Bounds the conversions running at once (each holds a whole document in memory).
  pub conversions: Arc<Semaphore>,
  /// Running and finished conversions (`/v1/processes`).
  pub jobs: Arc<jobs::Jobs>,
  /// The OpenAPI document, built once from the routes.
  pub openapi: Arc<utoipa::openapi::OpenApi>,
}

/// The OpenAPI document of the server.
pub fn openapi() -> utoipa::openapi::OpenApi {
  routes::router().into_openapi()
}

pub fn app(config: &Config) -> Router {
  let (router, openapi) = routes::router().split_for_parts();
  let state = AppState {
    config: Arc::new(config.clone()),
    conversions: Arc::new(Semaphore::new(config.max_concurrent_conversions)),
    jobs: Arc::new(jobs::Jobs::new(jobs::JobsConfig {
      retention: Duration::from_millis(config.process_retention_ms),
      max_completed: config.process_max_completed,
    })),
    openapi: Arc::new(openapi),
  };
  router
    .layer(DefaultBodyLimit::max(config.max_body_bytes))
    .layer(TraceLayer::new_for_http())
    .with_state(state)
}
