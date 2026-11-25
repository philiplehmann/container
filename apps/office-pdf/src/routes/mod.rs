pub mod error;
pub mod health;
pub mod v1;

use axum::Json;
use axum::extract::State;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::AppState;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "office-pdf",
        description = "Converts office documents (text, presentations, spreadsheets) to PDF and images with ArtCraft's WordCraft, DeckCraft and GridCraft, and works on PDFs (text, images, compress, encrypt, forms, split, merge, rotate, stamp), in one Rust server. The endpoints mirror the unoserver, poppler and pdftk images.",
        license(name = "MIT", identifier = "MIT"),
    ),
    servers((url = "/", description = "This server")),
    // No authentication: run it inside a trusted network, or put a proxy in front.
    security(()),
    tags(
        (name = "convert", description = "Office documents to PDF or images"),
        (name = "pdf", description = "PDF tools: text, images, compress, encrypt, forms, split, merge, rotate, stamp"),
        (name = "processes", description = "Running and finished jobs"),
        (name = "health", description = "Container probes (not versioned)"),
        (name = "meta", description = "API description"),
    ),
)]
pub struct ApiDoc;

/// The OpenAPI document of API version 1.
#[utoipa::path(
    get,
    path = "/openapi.json",
    tag = "meta",
    operation_id = "openapi",
    responses((status = 200, description = "OpenAPI 3.1 document", content_type = "application/json")),
)]
pub async fn openapi(State(state): State<AppState>) -> Json<std::sync::Arc<utoipa::openapi::OpenApi>> {
  Json(state.openapi)
}

/// Every route, with its OpenAPI description.
pub fn router() -> OpenApiRouter<AppState> {
  OpenApiRouter::with_openapi(ApiDoc::openapi())
    .nest(v1::PREFIX, v1::router().routes(routes!(openapi)))
    .routes(routes!(health::liveness))
    .routes(routes!(health::readiness))
}
