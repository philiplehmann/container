//! Version 1 of the API, served under `/v1`. Breaking changes go into a new version module
//! (`/v2`) next to this one, so existing clients keep working.
//!
//! The endpoints mirror the unoserver image (`/convert`, `/direct`, `/direct-fs`, `/processes`),
//! the poppler image (`/pdf-to-text`, `/pdf-to-html`) and the pdftk image (`/compress`,
//! `/encrypt`, `/data/*`, `/form/fill`, …), all always enabled.

pub mod convert;
pub mod direct_fs;
pub mod pdf;
pub mod processes;
pub mod run;

use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::AppState;

pub const PREFIX: &str = "/v1";

pub fn router() -> OpenApiRouter<AppState> {
  OpenApiRouter::new()
    .routes(routes!(convert::convert))
    .routes(routes!(convert::direct))
    .routes(routes!(direct_fs::direct_fs))
    .routes(routes!(pdf::pdf_to_text))
    .routes(routes!(pdf::pdf_to_html))
    .routes(routes!(pdf::pdf_to_image))
    .routes(routes!(pdf::compress))
    .routes(routes!(pdf::uncompress))
    .routes(routes!(pdf::encrypt))
    .routes(routes!(pdf::decrypt))
    .routes(routes!(pdf::data_fields))
    .routes(routes!(pdf::data_dump))
    .routes(routes!(pdf::data_annots))
    .routes(routes!(pdf::data_fdf))
    .routes(routes!(pdf::form_fill))
    .routes(routes!(pdf::cat))
    .routes(routes!(pdf::split))
    .routes(routes!(pdf::rotate))
    .routes(routes!(pdf::merge))
    .routes(routes!(pdf::stamp))
    .routes(routes!(pdf::background))
    .routes(routes!(processes::list, processes::clear))
    .routes(routes!(processes::get, processes::kill))
}
