//! Shared helpers of the HTTP tests.
#![allow(dead_code)]

use std::path::PathBuf;

use axum::Router;
use axum::body::Body;
use axum::http::{Method, Request, StatusCode, header};
use http_body_util::BodyExt;
use office_pdf::{Config, app};
use serde_json::Value;
use tower::ServiceExt;

pub const DOCX: &str = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

pub struct TestApp {
  pub router: Router,
}

pub struct Reply {
  pub status: StatusCode,
  pub content_type: Option<String>,
  pub body: Vec<u8>,
}

impl Reply {
  pub fn json(&self) -> Value {
    serde_json::from_slice(&self.body).unwrap_or_else(|e| panic!("not json ({e}): {}", self.text()))
  }

  pub fn text(&self) -> String {
    String::from_utf8_lossy(&self.body).to_string()
  }

  pub fn error(&self) -> String {
    self.json()["error"].as_str().expect("error field").to_string()
  }

  pub fn pages(&self) -> usize {
    assert!(self.body.starts_with(b"%PDF-"), "not a pdf: {}", self.text());
    lopdf::Document::load_mem(&self.body)
      .expect("valid pdf")
      .get_pages()
      .len()
  }
}

impl TestApp {
  pub fn new() -> Self {
    Self::with(Config::default())
  }

  pub fn with(config: Config) -> Self {
    Self { router: app(&config) }
  }

  pub async fn send(&self, request: Request<Body>) -> Reply {
    let response = self.router.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let content_type = response
      .headers()
      .get(header::CONTENT_TYPE)
      .map(|v| v.to_str().unwrap().to_string());
    let body = response.into_body().collect().await.unwrap().to_bytes().to_vec();
    Reply {
      status,
      content_type,
      body,
    }
  }

  pub async fn post(&self, uri: &str, body: Vec<u8>) -> Reply {
    self.send(Request::post(uri).body(Body::from(body)).unwrap()).await
  }

  pub async fn post_typed(&self, uri: &str, content_type: &str, body: Vec<u8>) -> Reply {
    let request = Request::post(uri)
      .header(header::CONTENT_TYPE, content_type)
      .body(Body::from(body))
      .unwrap();
    self.send(request).await
  }

  pub async fn post_json(&self, uri: &str, body: Value) -> Reply {
    self
      .post_typed(uri, "application/json", body.to_string().into_bytes())
      .await
  }

  /// A `multipart/form-data` request with one PDF file per `(field, bytes)`.
  pub async fn post_multipart(&self, uri: &str, parts: &[(&str, Vec<u8>)]) -> Reply {
    let boundary = "office-pdf-test-boundary";
    let mut body = Vec::new();
    for (name, bytes) in parts {
      body.extend_from_slice(
                format!(
                    "--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{name}.pdf\"\r\nContent-Type: application/pdf\r\n\r\n"
                )
                .as_bytes(),
            );
      body.extend_from_slice(bytes);
      body.extend_from_slice(b"\r\n");
    }
    body.extend_from_slice(format!("--{boundary}--\r\n").as_bytes());
    self
      .post_typed(uri, &format!("multipart/form-data; boundary={boundary}"), body)
      .await
  }

  pub async fn call(&self, method: Method, uri: &str) -> Reply {
    self
      .send(Request::builder().method(method).uri(uri).body(Body::empty()).unwrap())
      .await
  }
}

pub fn asset(name: &str) -> Vec<u8> {
  std::fs::read(asset_path(name)).unwrap()
}

pub fn asset_path(name: &str) -> PathBuf {
  PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    .join("tests/assets")
    .join(name)
}

pub fn encode(s: &str) -> String {
  s.bytes()
    .map(|b| match b {
      b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
      _ => format!("%{b:02X}"),
    })
    .collect()
}

/// An xlsx made from CSV by GridCraft itself (the repo has no spreadsheet fixture).
pub fn xlsx() -> Vec<u8> {
  let (workbook, _) = gridcraft_engine::io::open_bytes("data.csv", b"Name,Amount\nRent,1200\nFood,450\n").unwrap();
  gridcraft_engine::io::save_bytes(&workbook, "data.xlsx").unwrap()
}
