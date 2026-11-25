//! The poppler and pdftk images' endpoints (`/pdf-to-text`, `/pdf-to-html`, `/compress`,
//! `/encrypt`, `/data/fields`, `/form/fill`, …) plus the pdftk and poppler operations those
//! images don't expose (`/pdf-to-image`, `/cat`, `/split`, `/merge`, `/rotate`, `/stamp`,
//! `/background`, `/data/annots`). The request body is the PDF unless stated otherwise; the
//! password of an encrypted input goes in `X-Document-Password`.

use axum::Json;
use axum::body::Bytes;
use axum::extract::rejection::BytesRejection;
use axum::extract::{Multipart, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum_extra::extract::{Query, QueryRejection};
use serde::Deserialize;
use serde::de::DeserializeOwned;
use utoipa::IntoParams;

use super::convert::PASSWORD_HEADER;
use super::run::{self, run_task};
use crate::AppState;
use crate::convert::OutputType;
use crate::pdf::forms::{self, Field, FillFlag};
use crate::pdf::info::{self, Annotation, Dump};
use crate::pdf::overlay::{self, Placement};
use crate::pdf::security::{self, Allow, EncryptOptions, Encryption};
use crate::pdf::{self as pdflib, PdfError, pages, render, text, zip};
use crate::routes::error::{ErrorBody, error};

const PDF: &str = "application/pdf";
const ZIP: &str = "application/zip";

type Rejected = Box<Response>;

fn query<T>(query: Result<Query<T>, QueryRejection>) -> Result<T, Rejected> {
  query
    .map(|Query(q)| q)
    .map_err(|e| Box::new(error(e.status(), &e.body_text())))
}

fn pdf_body(body: Result<Bytes, BytesRejection>) -> Result<Bytes, Rejected> {
  let body = body.map_err(|e| Box::new(error(e.status(), &e.body_text())))?;
  if body.is_empty() {
    return Err(Box::new(error(StatusCode::BAD_REQUEST, "request body is empty")));
  }
  Ok(body)
}

fn password(headers: &HeaderMap) -> Option<String> {
  headers
    .get(PASSWORD_HEADER)
    .and_then(|v| v.to_str().ok())
    .map(str::to_string)
}

/// Run a PDF operation as a tracked job; errors become responses.
async fn job<T, F>(
  state: &AppState,
  command: &str,
  args: Vec<String>,
  timeout_ms: Option<u64>,
  work: F,
) -> Result<T, Rejected>
where
  T: Send + 'static,
  F: FnOnce() -> Result<T, PdfError> + Send + 'static,
{
  let timeout = run::timeout(timeout_ms).map_err(|e| Box::new(error(StatusCode::BAD_REQUEST, &e)))?;
  run_task(state, command, args, timeout, work)
    .await
    .map_err(|e| Box::new(error(e.status(), &e.to_string())))
}

fn file(mime: &'static str, bytes: Vec<u8>, name: Option<&str>) -> Response {
  let mut response = ([(header::CONTENT_TYPE, mime)], bytes).into_response();
  if let Some(name) = name
    && let Ok(value) = HeaderValue::from_str(&format!("attachment; filename=\"{name}\""))
  {
    response.headers_mut().insert(header::CONTENT_DISPOSITION, value);
  }
  response
}

macro_rules! unwrap_or_respond {
  ($e:expr) => {
    match $e {
      Ok(v) => v,
      Err(response) => return *response,
    }
  };
}

/// Options every PDF endpoint takes.
#[derive(Debug, Default, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct JobQuery {
  /// Stop waiting after this many milliseconds; the job is listed as killed.
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

#[derive(Debug, Default, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct TextQuery {
  /// Pages to extract (`1-3`, `2,5`, `4-`); default all.
  #[param(example = "1-2")]
  pub pages: Option<String>,
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

fn page_list(range: Option<&str>, bytes: &[u8], password: Option<&str>) -> Result<Vec<u32>, PdfError> {
  match range {
    None => Ok(Vec::new()),
    Some(range) => {
      let count = pdflib::open(bytes, password)?.get_pages().len() as u32;
      crate::convert::filters::parse_page_range(range, count).map_err(|e| PdfError::BadRequest(e.to_string()))
    }
  }
}

/// Extract the text (poppler `pdftotext`).
///
/// Lines in reading order, pages separated by a form feed (`\f`).
#[utoipa::path(
    post, path = "/pdf-to-text", tag = "pdf", operation_id = "pdfToText",
    params(TextQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The text", content_type = "text/plain"),
        (status = 400, description = "Invalid parameters or empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn pdf_to_text(
  State(state): State<AppState>,
  q: Result<Query<TextQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let args = q.pages.iter().flat_map(|p| ["-pages".to_string(), p.clone()]).collect();
  let text = unwrap_or_respond!(
    job(&state, "pdftotext", args, q.timeout_ms, move || {
      let pages = page_list(q.pages.as_deref(), &body, password.as_deref())?;
      Ok(text::to_text(&text::extract(&body, password.as_deref(), &pages)?))
    })
    .await
  );
  ([(header::CONTENT_TYPE, "text/plain; charset=utf-8")], text).into_response()
}

/// Convert to HTML (poppler `pdftohtml -noframes`).
///
/// One HTML document; each page a block with its lines positioned as on the page.
#[utoipa::path(
    post, path = "/pdf-to-html", tag = "pdf", operation_id = "pdfToHtml",
    params(TextQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The HTML", content_type = "text/html"),
        (status = 400, description = "Invalid parameters or empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn pdf_to_html(
  State(state): State<AppState>,
  q: Result<Query<TextQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let args = q.pages.iter().flat_map(|p| ["-pages".to_string(), p.clone()]).collect();
  let html = unwrap_or_respond!(
    job(&state, "pdftohtml", args, q.timeout_ms, move || {
      let pages = page_list(q.pages.as_deref(), &body, password.as_deref())?;
      let title = info::dump(&body, password.as_deref())?.info.title.unwrap_or_default();
      Ok(text::to_html(
        &text::extract(&body, password.as_deref(), &pages)?,
        &title,
      ))
    })
    .await
  );
  ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], html).into_response()
}

#[derive(Debug, Default, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct ImageQuery {
  /// Pages to render (`1`, `1-3`); default the first. Several pages answer with a ZIP.
  #[param(example = "1")]
  pub pages: Option<String>,
  /// Resolution in dots per inch (1-1200, default 150).
  #[param(minimum = 1, maximum = 1200)]
  pub dpi: Option<f32>,
  /// Image type: png (default), jpeg or webp.
  pub convert_to: Option<OutputType>,
  /// JPEG quality 1-100 (default 90).
  #[param(minimum = 1, maximum = 100)]
  pub quality: Option<u8>,
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

/// Render pages as images (poppler `pdftoppm`).
#[utoipa::path(
    post, path = "/pdf-to-image", tag = "pdf", operation_id = "pdfToImage",
    params(ImageQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "One image, or a ZIP of `page-N.ext` images for several pages",
            content(("image/png"), ("image/jpeg"), ("image/webp"), ("application/zip"))),
        (status = 400, description = "Invalid parameters, page out of range, image too large", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn pdf_to_image(
  State(state): State<AppState>,
  q: Result<Query<ImageQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let format = q.convert_to.unwrap_or(OutputType::Png);
  if format == OutputType::Pdf {
    return error(StatusCode::BAD_REQUEST, "convertTo must be png, jpeg or webp");
  }
  if q.quality.is_some_and(|v| !(1..=100).contains(&v)) {
    return error(StatusCode::BAD_REQUEST, "quality must be 1-100");
  }
  let password = password(&headers);
  let dpi = q.dpi.unwrap_or(150.0);
  let args = vec!["-r".into(), dpi.to_string(), format!("-{}", format.as_str())];
  let range = q.pages.clone();
  let (pages, images) = unwrap_or_respond!(
    job(&state, "pdftoppm", args, q.timeout_ms, move || {
      let pages = page_list(Some(range.as_deref().unwrap_or("1")), &body, password.as_deref())?;
      let images = render::render(&body, password.as_deref(), &pages, dpi, format, q.quality.unwrap_or(90))?;
      Ok((pages, images))
    })
    .await
  );
  let ext = if format == OutputType::Jpeg {
    "jpg"
  } else {
    format.as_str()
  };
  match <[Vec<u8>; 1]>::try_from(images) {
    Ok([image]) => file(format.mime(), image, None),
    Err(images) => {
      let entries: Vec<(String, Vec<u8>)> = pages
        .iter()
        .zip(images)
        .map(|(p, image)| (format!("page-{p}.{ext}"), image))
        .collect();
      file(ZIP, zip::zip(&entries), Some("pages.zip"))
    }
  }
}

/// Compress (pdftk `compress`): deflated streams in compressed object streams.
#[utoipa::path(
    post, path = "/compress", tag = "pdf", operation_id = "compress",
    params(JobQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The compressed PDF (decrypted if it was encrypted)", content_type = "application/pdf"),
        (status = 400, description = "Empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn compress(
  State(state): State<AppState>,
  q: Result<Query<JobQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let pdf = unwrap_or_respond!(
    job(&state, "pdftk", vec!["compress".into()], q.timeout_ms, move || {
      pdflib::compress(&body, password.as_deref())
    })
    .await
  );
  file(PDF, pdf, None)
}

/// Uncompress (pdftk `uncompress`): decoded streams, readable in a text editor.
#[utoipa::path(
    post, path = "/uncompress", tag = "pdf", operation_id = "uncompress",
    params(JobQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The uncompressed PDF (decrypted if it was encrypted)", content_type = "application/pdf"),
        (status = 400, description = "Empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn uncompress(
  State(state): State<AppState>,
  q: Result<Query<JobQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let pdf = unwrap_or_respond!(
    job(&state, "pdftk", vec!["uncompress".into()], q.timeout_ms, move || {
      pdflib::uncompress(&body, password.as_deref())
    })
    .await
  );
  file(PDF, pdf, None)
}

#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct EncryptQuery {
  /// Owner password (needed to change permissions).
  pub password: String,
  /// User password, needed to open the file. Default: none, the file opens without one.
  pub user_password: Option<String>,
  /// Permissions to grant; repeat for several. Default: none.
  #[serde(default)]
  #[param(inline)]
  pub allow: Vec<Allow>,
  /// Algorithm (default aes256).
  #[param(inline)]
  pub encryption: Option<Encryption>,
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

/// Encrypt (pdftk `owner_pw` / `user_pw` / `allow`).
#[utoipa::path(
    post, path = "/encrypt", tag = "pdf", operation_id = "encrypt",
    params(EncryptQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an already encrypted input")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The encrypted PDF", content_type = "application/pdf"),
        (status = 400, description = "Missing password, invalid permission, empty body", body = ErrorBody),
        (status = 401, description = "Input password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn encrypt(
  State(state): State<AppState>,
  q: Result<Query<EncryptQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let input_password = password(&headers);
  let args = q
    .allow
    .iter()
    .flat_map(|a| ["allow".to_string(), format!("{a:?}")])
    .collect();
  let pdf = unwrap_or_respond!(
    job(&state, "pdftk", args, q.timeout_ms, move || {
      security::encrypt(
        &body,
        input_password.as_deref(),
        &EncryptOptions {
          owner_password: &q.password,
          user_password: q.user_password.as_deref(),
          allow: &q.allow,
          encryption: q.encryption.unwrap_or_default(),
        },
      )
    })
    .await
  );
  file(PDF, pdf, None)
}

#[derive(Debug, Default, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct DecryptQuery {
  /// Owner or user password (or `X-Document-Password`).
  pub password: Option<String>,
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

/// Decrypt (pdftk `input_pw`): the same PDF without encryption.
#[utoipa::path(
    post, path = "/decrypt", tag = "pdf", operation_id = "decrypt",
    params(DecryptQuery, ("X-Document-Password" = Option<String>, Header, description = "Password, instead of the query")),
    request_body(content(("application/pdf")), description = "The encrypted PDF"),
    responses(
        (status = 200, description = "The decrypted PDF", content_type = "application/pdf"),
        (status = 400, description = "Empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn decrypt(
  State(state): State<AppState>,
  q: Result<Query<DecryptQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = q.password.or_else(|| password(&headers));
  let pdf = unwrap_or_respond!(
    job(&state, "pdftk", vec!["input_pw".into()], q.timeout_ms, move || {
      security::decrypt(&body, password.as_deref())
    })
    .await
  );
  file(PDF, pdf, None)
}

/// Form fields (pdftk `dump_data_fields`), as the pdftk image's JSON.
#[utoipa::path(
    post, path = "/data/fields", tag = "pdf", operation_id = "dataFields",
    params(JobQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The fields, in form order", body = Vec<Field>),
        (status = 400, description = "Empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn data_fields(
  State(state): State<AppState>,
  q: Result<Query<JobQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let fields = unwrap_or_respond!(
    job(
      &state,
      "pdftk",
      vec!["dump_data_fields_utf8".into()],
      q.timeout_ms,
      move || { forms::fields(&body, password.as_deref()) }
    )
    .await
  );
  Json(fields).into_response()
}

/// Document information (pdftk `dump_data`), as the pdftk image's JSON.
#[utoipa::path(
    post, path = "/data/dump", tag = "pdf", operation_id = "dataDump",
    params(JobQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "Info dictionary, file ids, pages", body = Dump),
        (status = 400, description = "Empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn data_dump(
  State(state): State<AppState>,
  q: Result<Query<JobQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let dump = unwrap_or_respond!(
    job(
      &state,
      "pdftk",
      vec!["dump_data_utf8".into()],
      q.timeout_ms,
      move || { info::dump(&body, password.as_deref()) }
    )
    .await
  );
  Json(dump).into_response()
}

/// Annotations of every page (pdftk `dump_data_annots`).
#[utoipa::path(
    post, path = "/data/annots", tag = "pdf", operation_id = "dataAnnots",
    params(JobQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The annotations, page by page", body = Vec<Annotation>),
        (status = 400, description = "Empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn data_annots(
  State(state): State<AppState>,
  q: Result<Query<JobQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let annots = unwrap_or_respond!(
    job(
      &state,
      "pdftk",
      vec!["dump_data_annots".into()],
      q.timeout_ms,
      move || { info::annotations(&body, password.as_deref()) }
    )
    .await
  );
  Json(annots).into_response()
}

/// Form data as FDF (pdftk `generate_fdf`).
#[utoipa::path(
    post, path = "/data/fdf", tag = "pdf", operation_id = "dataFdf",
    params(JobQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The FDF", content_type = "application/vnd.fdf"),
        (status = 400, description = "Empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn data_fdf(
  State(state): State<AppState>,
  q: Result<Query<JobQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let fdf = unwrap_or_respond!(
    job(&state, "pdftk", vec!["generate_fdf".into()], q.timeout_ms, move || {
      forms::fdf(&body, password.as_deref())
    })
    .await
  );
  file("application/vnd.fdf", fdf, None)
}

/// The documented options of `/form/fill`; every other query parameter is a field value.
#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
#[into_params(parameter_in = Query)]
pub struct FillQuery {
  /// need_appearances (default): fields stay editable; flatten: merged into the page;
  /// replacement_font: drawn with `fontName`.
  #[param(inline)]
  pub flag: Option<FillFlag>,
  /// A standard PDF font (Helvetica, Times-Roman, Courier, … -Bold, -Italic/-Oblique) for
  /// `replacement_font`.
  pub font_name: Option<String>,
}

/// Fill a form (pdftk `fill_form`).
///
/// Field values are query parameters named by the fully qualified field name
/// (`?Name=John&Address=Main%20St&Check%20Box1=true`). Check boxes and radio buttons take
/// `true` / `false` or a state name. Unknown names are ignored.
#[utoipa::path(
    post, path = "/form/fill", tag = "pdf", operation_id = "formFill",
    params(FillQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF form"),
    responses(
        (status = 200, description = "The filled PDF", content_type = "application/pdf"),
        (status = 400, description = "Invalid flag, font or button value, empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn form_fill(
  State(state): State<AppState>,
  q: Result<Query<Vec<(String, String)>>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let pairs = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let (values, options) = forms::values_from_query(pairs);
  let options: FillQuery = match parse_pairs(&options) {
    Ok(o) => o,
    Err(e) => return error(StatusCode::BAD_REQUEST, &e),
  };
  let password = password(&headers);
  let flag = options.flag.unwrap_or_default();
  let args = values
    .keys()
    .map(|k| format!("{k}=…"))
    .chain([format!("{flag:?}")])
    .collect();
  let pdf = unwrap_or_respond!(
    job(&state, "pdftk", args, None, move || {
      forms::fill(&body, password.as_deref(), &values, flag, options.font_name.as_deref())
    })
    .await
  );
  file(PDF, pdf, None)
}

fn parse_pairs<T: DeserializeOwned>(pairs: &[(String, String)]) -> Result<T, String> {
  let encoded: String = pairs
    .iter()
    .map(|(k, v)| format!("{}={}", urlencode(k), urlencode(v)))
    .collect::<Vec<_>>()
    .join("&");
  serde_html_form::from_str(&encoded).map_err(|e| e.to_string())
}

fn urlencode(s: &str) -> String {
  s.bytes()
    .map(|b| match b {
      b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
      _ => format!("%{b:02X}"),
    })
    .collect()
}

#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct CatQuery {
  /// Pages in pdftk `cat` syntax: `1-3,7`, `5-1` (backwards), `end`, `r1` (last), `1-endodd`;
  /// pages may repeat.
  #[param(example = "3,1-2")]
  pub pages: String,
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

/// Select and reorder pages (pdftk `cat`).
#[utoipa::path(
    post, path = "/cat", tag = "pdf", operation_id = "cat",
    params(CatQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The PDF with those pages", content_type = "application/pdf"),
        (status = 400, description = "Invalid page sequence, empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn cat(
  State(state): State<AppState>,
  q: Result<Query<CatQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let args = vec!["cat".into(), q.pages.clone()];
  let pdf = unwrap_or_respond!(
    job(&state, "pdftk", args, q.timeout_ms, move || pages::select(
      &body,
      password.as_deref(),
      &q.pages
    ))
    .await
  );
  file(PDF, pdf, None)
}

#[derive(Debug, Default, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct SplitQuery {
  /// One output file per range (pdftk `cat` syntax), e.g. `range=1-2&range=3-end`.
  #[serde(default)]
  pub range: Vec<String>,
  /// Without `range`: pages per output file (default 1, pdftk `burst`).
  #[param(minimum = 1)]
  pub every: Option<u32>,
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

/// Split into several PDFs (pdftk `burst`), answered as a ZIP.
///
/// Without parameters every page becomes `pg_0001.pdf`, `pg_0002.pdf`, …; with `every` or
/// `range` the files are `part_0001.pdf`, ….
#[utoipa::path(
    post, path = "/split", tag = "pdf", operation_id = "split",
    params(SplitQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "A ZIP of the PDFs", content_type = "application/zip"),
        (status = 400, description = "Invalid range, empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn split(
  State(state): State<AppState>,
  q: Result<Query<SplitQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  if q.every == Some(0) {
    return error(StatusCode::BAD_REQUEST, "every must be at least 1");
  }
  let password = password(&headers);
  let parts = unwrap_or_respond!(
    job(&state, "pdftk", vec!["burst".into()], q.timeout_ms, move || {
      pages::split(&body, password.as_deref(), &q.range, q.every)
    })
    .await
  );
  file(ZIP, zip::zip(&parts), Some("split.zip"))
}

#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct RotateQuery {
  /// Degrees clockwise, a multiple of 90 (negative turns counter-clockwise).
  #[param(example = 90)]
  pub angle: i64,
  /// Pages to rotate (pdftk `cat` syntax); default all.
  pub pages: Option<String>,
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

/// Rotate pages (pdftk `rotate`), on top of their current rotation.
#[utoipa::path(
    post, path = "/rotate", tag = "pdf", operation_id = "rotate",
    params(RotateQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted PDF")),
    request_body(content(("application/pdf")), description = "The PDF"),
    responses(
        (status = 200, description = "The rotated PDF", content_type = "application/pdf"),
        (status = 400, description = "Invalid angle or pages, empty body", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn rotate(
  State(state): State<AppState>,
  q: Result<Query<RotateQuery>, QueryRejection>,
  headers: HeaderMap,
  body: Result<Bytes, BytesRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let body = unwrap_or_respond!(pdf_body(body));
  let password = password(&headers);
  let args = vec!["rotate".into(), q.angle.to_string()];
  let pdf = unwrap_or_respond!(
    job(&state, "pdftk", args, q.timeout_ms, move || {
      pages::rotate(&body, password.as_deref(), q.angle, q.pages.as_deref())
    })
    .await
  );
  file(PDF, pdf, None)
}

/// The files of a multipart request: (field name, bytes), in order.
async fn parts(mut multipart: Multipart) -> Result<Vec<(String, Vec<u8>)>, Rejected> {
  let mut out = Vec::new();
  loop {
    match multipart.next_field().await {
      Ok(Some(field)) => {
        let name = field.name().unwrap_or_default().to_string();
        let bytes = field
          .bytes()
          .await
          .map_err(|e| Box::new(error(e.status(), &e.body_text())))?;
        out.push((name, bytes.to_vec()));
      }
      Ok(None) => return Ok(out),
      Err(e) => return Err(Box::new(error(e.status(), &e.body_text()))),
    }
  }
}

/// Merge PDFs (pdftk `cat` of several files).
///
/// A `multipart/form-data` body with the PDFs as file fields (any names), in the order to merge.
#[utoipa::path(
    post, path = "/merge", tag = "pdf", operation_id = "merge",
    params(JobQuery),
    request_body(content(("multipart/form-data")), description = "The PDFs, as file fields in order"),
    responses(
        (status = 200, description = "One PDF with all pages", content_type = "application/pdf"),
        (status = 400, description = "No files, or not multipart", body = ErrorBody),
        (status = 401, description = "A PDF needs a password", body = ErrorBody),
        (status = 422, description = "A file is not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn merge(
  State(state): State<AppState>,
  q: Result<Query<JobQuery>, QueryRejection>,
  multipart: Result<Multipart, axum::extract::multipart::MultipartRejection>,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let multipart = match multipart {
    Ok(m) => m,
    Err(e) => return error(e.status(), &e.body_text()),
  };
  let files = unwrap_or_respond!(parts(multipart).await);
  let args = files
    .iter()
    .map(|(name, _)| name.clone())
    .chain(["cat".into()])
    .collect();
  let inputs: Vec<(Vec<u8>, Option<String>)> = files.into_iter().map(|(_, bytes)| (bytes, None)).collect();
  let pdf = unwrap_or_respond!(job(&state, "pdftk", args, q.timeout_ms, move || pages::merge(&inputs)).await);
  file(PDF, pdf, None)
}

#[derive(Debug, Default, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct OverlayQuery {
  /// Page n of the overlay on page n (pdftk `multistamp` / `multibackground`) instead of
  /// its first page on every page.
  #[serde(default)]
  pub multi: bool,
  #[param(minimum = 1)]
  pub timeout_ms: Option<u64>,
}

async fn overlay_request(
  state: AppState,
  q: Result<Query<OverlayQuery>, QueryRejection>,
  headers: HeaderMap,
  multipart: Result<Multipart, axum::extract::multipart::MultipartRejection>,
  placement: Placement,
) -> Response {
  let q = unwrap_or_respond!(query(q));
  let multipart = match multipart {
    Ok(m) => m,
    Err(e) => return error(e.status(), &e.body_text()),
  };
  let files = unwrap_or_respond!(parts(multipart).await);
  let overlay_field = if placement == Placement::Stamp {
    "stamp"
  } else {
    "background"
  };
  let find = |name: &str| files.iter().find(|(n, _)| n == name).map(|(_, b)| b.clone());
  let (Some(document), Some(overlay)) = (find("file"), find(overlay_field)) else {
    return error(
      StatusCode::BAD_REQUEST,
      &format!("send the PDF as `file` and the overlay as `{overlay_field}`"),
    );
  };
  let password = password(&headers);
  let command = match (placement, q.multi) {
    (Placement::Stamp, false) => "stamp",
    (Placement::Stamp, true) => "multistamp",
    (Placement::Background, false) => "background",
    (Placement::Background, true) => "multibackground",
  };
  let pdf = unwrap_or_respond!(
    job(&state, "pdftk", vec![command.into()], q.timeout_ms, move || {
      overlay::overlay(&document, password.as_deref(), &overlay, placement, q.multi)
    })
    .await
  );
  file(PDF, pdf, None)
}

/// Stamp another PDF's page over every page (pdftk `stamp` / `multistamp`).
///
/// A `multipart/form-data` body: the PDF as `file`, the stamp PDF as `stamp`. The stamp page is
/// scaled to fit each page and centred.
#[utoipa::path(
    post, path = "/stamp", tag = "pdf", operation_id = "stamp",
    params(OverlayQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted `file`")),
    request_body(content(("multipart/form-data")), description = "`file` and `stamp`"),
    responses(
        (status = 200, description = "The stamped PDF", content_type = "application/pdf"),
        (status = 400, description = "Missing `file` or `stamp`, unreadable stamp", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn stamp(
  State(state): State<AppState>,
  q: Result<Query<OverlayQuery>, QueryRejection>,
  headers: HeaderMap,
  multipart: Result<Multipart, axum::extract::multipart::MultipartRejection>,
) -> Response {
  overlay_request(state, q, headers, multipart, Placement::Stamp).await
}

/// Put another PDF's page under every page (pdftk `background` / `multibackground`).
///
/// A `multipart/form-data` body: the PDF as `file`, the background PDF as `background`.
#[utoipa::path(
    post, path = "/background", tag = "pdf", operation_id = "background",
    params(OverlayQuery, ("X-Document-Password" = Option<String>, Header, description = "Password of an encrypted `file`")),
    request_body(content(("multipart/form-data")), description = "`file` and `background`"),
    responses(
        (status = 200, description = "The PDF with the background", content_type = "application/pdf"),
        (status = 400, description = "Missing `file` or `background`, unreadable background", body = ErrorBody),
        (status = 401, description = "Password missing or wrong", body = ErrorBody),
        (status = 422, description = "Not a readable PDF", body = ErrorBody),
    ),
)]
pub async fn background(
  State(state): State<AppState>,
  q: Result<Query<OverlayQuery>, QueryRejection>,
  headers: HeaderMap,
  multipart: Result<Multipart, axum::extract::multipart::MultipartRejection>,
) -> Response {
  overlay_request(state, q, headers, multipart, Placement::Background).await
}
