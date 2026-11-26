//! `/convert` and `/direct`: the request body is the document, the response the converted file.
//! Same query parameters as unoserver's endpoints; both are always available (unoserver needs
//! a running LibreOffice for `/convert` and a fresh one per request for `/direct`, here both run
//! the same in-process engines).

use axum::body::Bytes;
use axum::extract::State;
use axum::extract::rejection::BytesRejection;
use axum::http::{HeaderMap, header};
use axum::response::{IntoResponse, Response};
use axum_extra::extract::{Query, QueryRejection};
use serde::Deserialize;
use utoipa::IntoParams;

use super::run;
use crate::AppState;
use crate::convert::{ConvertRequest, OutputType, detect};
use crate::routes::error::{ErrorBody, error};

/// Header carrying the password of an encrypted document (kept out of the query string, which
/// ends up in access logs).
pub const PASSWORD_HEADER: &str = "x-document-password";

/// Query of `POST /convert` (unoserver's `unoconvert` options plus `format`, `markup`, `strict`).
#[derive(Debug, Default, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct ConvertQuery {
  /// Output type. Defaults to the output filter's type, else pdf.
  pub convert_to: Option<OutputType>,
  /// LibreOffice import filter name (`MS Word 2007 XML`, `Impress MS PowerPoint 2007 XML`, …);
  /// names the input format.
  pub input_filter: Option<String>,
  /// LibreOffice export filter name (`writer_pdf_Export`, `impress_png_Export`, …).
  pub output_filter: Option<String>,
  /// Filter options: `Name=Value` or a JSON object (`{"PageRange":{"type":"string","value":"1-2"}}`).
  /// Repeat the parameter for several. `PageRange` selects pages (slides) and `Quality` sets
  /// JPEG quality; others are accepted and have no effect. Needs `outputFilter`.
  #[serde(default)]
  pub filter_options: Vec<String>,
  /// Stop waiting after this many milliseconds; the conversion is listed as killed.
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
  /// Update indexes and fields (tables of contents) before exporting.
  #[serde(default)]
  pub update_index: bool,
  /// Don't update indexes (the default; accepted for unoserver compatibility).
  #[serde(default)]
  pub dont_update_index: bool,
  /// Accepted for unoserver compatibility; enable debug logs with `RUST_LOG` instead.
  #[serde(default)]
  pub verbose: bool,
  /// Accepted for unoserver compatibility.
  #[serde(default)]
  #[allow(dead_code)]
  pub quiet: bool,
  /// Input format by file extension (docx, doc, odt, rtf, html, md, txt, pptx, ppt, xlsx, xls,
  /// ods, csv, …). Without it (and without `inputFilter`) the format is taken from
  /// `Content-Type`, else detected from the content.
  #[param(example = "docx")]
  pub format: Option<String>,
  /// Print Markup: tracked changes marked up and comments beside each page (text documents).
  #[serde(default)]
  pub markup: bool,
  /// Fail with 422 instead of writing output with missing glyphs or pictures (text documents).
  #[serde(default)]
  pub strict: bool,
}

/// Query of `POST /direct` (unoserver's LibreOffice options plus `format`, `markup`, `strict`).
#[derive(Debug, Default, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct DirectQuery {
  /// Output type. Defaults to the output filter's type, else pdf.
  pub convert_to: Option<OutputType>,
  /// LibreOffice export filter name (`writer_pdf_Export`, `impress_png_Export`, …).
  pub output_filter: Option<String>,
  /// Filter options, as for `/convert`. Needs `outputFilter`.
  #[serde(default)]
  pub filter_options: Vec<String>,
  /// Stop waiting after this many milliseconds; the conversion is listed as killed.
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
  /// Input format by file extension, as for `/convert`.
  #[param(example = "doc")]
  pub format: Option<String>,
  /// Print Markup (text documents).
  #[serde(default)]
  pub markup: bool,
  /// Refuse output with missing glyphs or pictures (text documents).
  #[serde(default)]
  pub strict: bool,
}

impl From<DirectQuery> for ConvertQuery {
  fn from(q: DirectQuery) -> Self {
    ConvertQuery {
      convert_to: q.convert_to,
      output_filter: q.output_filter,
      filter_options: q.filter_options,
      timeout_ms: q.timeout_ms,
      format: q.format,
      markup: q.markup,
      strict: q.strict,
      ..Default::default()
    }
  }
}

/// Convert a document (unoserver `/convert`).
///
/// The request body is the document itself (not a multipart form); the response is the PDF or
/// image. Text documents, presentations and spreadsheets are supported; images are one page
/// (the first of `PageRange`), spreadsheets convert to PDF only.
#[utoipa::path(
    post,
    path = "/convert",
    tag = "convert",
    operation_id = "convert",
    params(
        ConvertQuery,
        ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted document"),
    ),
    request_body(
        description = "The document. `Content-Type` may name the format instead of `format`.",
        content(
            ("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            ("application/msword"),
            ("application/vnd.oasis.opendocument.text"),
            ("application/rtf"),
            ("text/html"),
            ("text/markdown"),
            ("text/plain"),
            ("application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            ("application/vnd.ms-powerpoint"),
            ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            ("application/vnd.ms-excel"),
            ("application/vnd.oasis.opendocument.spreadsheet"),
            ("text/csv"),
            ("application/octet-stream"),
        ),
    ),
    responses(
        (status = 200, description = "The converted document",
            content(("application/pdf"), ("image/png"), ("image/jpeg"), ("image/webp"))),
        (status = 400, description = "Invalid parameters, unknown filter or filter option, empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 413, description = "Body larger than `MAX_BODY_BYTES`", body = ErrorBody),
        (status = 415, description = "Unsupported input format or output type", body = ErrorBody),
        (status = 422, description = "Document can't be read, or `strict` refused it", body = ErrorBody),
        (status = 500, description = "Conversion failed or was killed", body = ErrorBody),
        (status = 504, description = "Conversion exceeded `timeoutMs`", body = ErrorBody),
    ),
)]
pub async fn convert(
  State(state): State<AppState>,
  query: Result<Query<ConvertQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let query = match query {
    Ok(Query(query)) => query,
    Err(e) => return error(e.status(), &e.body_text()),
  };
  handle(state, query, headers, body).await
}

/// Convert a document (unoserver `/direct`).
///
/// unoserver runs a fresh LibreOffice per request here; with the in-process engines it is the
/// same conversion as `/convert`, with `/direct`'s smaller set of parameters.
#[utoipa::path(
    post,
    path = "/direct",
    tag = "convert",
    operation_id = "direct",
    params(
        DirectQuery,
        ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted document"),
    ),
    request_body(
        description = "The document.",
        content(("application/octet-stream")),
    ),
    responses(
        (status = 200, description = "The converted document",
            content(("application/pdf"), ("image/png"), ("image/jpeg"), ("image/webp"))),
        (status = 400, description = "Invalid parameters, unknown filter or filter option, empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 413, description = "Body larger than `MAX_BODY_BYTES`", body = ErrorBody),
        (status = 415, description = "Unsupported input format or output type", body = ErrorBody),
        (status = 422, description = "Document can't be read, or `strict` refused it", body = ErrorBody),
        (status = 500, description = "Conversion failed or was killed", body = ErrorBody),
        (status = 504, description = "Conversion exceeded `timeoutMs`", body = ErrorBody),
    ),
)]
pub async fn direct(
  State(state): State<AppState>,
  query: Result<Query<DirectQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let query = match query {
    Ok(Query(query)) => query,
    Err(e) => return error(e.status(), &e.body_text()),
  };
  handle(state, query.into(), headers, body).await
}

async fn handle(
  state: AppState,
  query: ConvertQuery,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  // axum's own rejections answer in plain text; the API answers every error with `ErrorBody`.
  let body = match body {
    Ok(body) => body,
    Err(e) => return error(e.status(), &e.body_text()),
  };
  if body.is_empty() {
    return error(axum::http::StatusCode::BAD_REQUEST, "request body is empty");
  }
  if !query.filter_options.is_empty() && query.output_filter.is_none() {
    return error(
      axum::http::StatusCode::BAD_REQUEST,
      "filterOptions can only be provided when outputFilter is set",
    );
  }
  let timeout = match run::timeout(query.timeout_ms) {
    Ok(t) => t,
    Err(e) => return error(axum::http::StatusCode::BAD_REQUEST, &e),
  };
  let format = query.format.or_else(|| {
    // Only when no input filter names the format.
    query.input_filter.is_none().then_some(())?;
    headers
      .get(header::CONTENT_TYPE)
      .and_then(|v| v.to_str().ok())
      .and_then(detect::format_from_mime)
      .map(str::to_string)
  });
  if query.verbose {
    tracing::info!(?format, input_filter = ?query.input_filter, output_filter = ?query.output_filter,
            filter_options = ?query.filter_options, "conversion requested");
  }
  let request = ConvertRequest {
    format,
    input_filter: query.input_filter,
    convert_to: query.convert_to,
    output_filter: query.output_filter,
    filter_options: query.filter_options,
    update_index: query.update_index && !query.dont_update_index,
    password: headers
      .get(PASSWORD_HEADER)
      .and_then(|v| v.to_str().ok())
      .map(str::to_string),
    markup: query.markup,
    strict: query.strict,
  };

  match run::run(&state, body, request, timeout).await {
    Ok(converted) => ([(header::CONTENT_TYPE, converted.output.mime())], converted.bytes).into_response(),
    Err(e) => error(e.status(), &e.to_string()),
  }
}
