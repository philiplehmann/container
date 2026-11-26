//! HTTP tests. The `unoserver_*` modules port the unoserver image's test suites
//! (apps/unoserver/src/test) to the `/v1` API: the same requests and expectations, without the
//! feature switches (every endpoint is always available here).

mod common;

use std::path::PathBuf;
use std::time::Duration;

use axum::http::{Method, StatusCode};
use common::*;
use office_pdf::Config;
use serde_json::{Value, json};

/// unoserver.spec.ts: `/convert`.
mod unoserver_convert {
  use super::*;

  #[tokio::test]
  async fn should_convert_docx_to_pdf_per_default() {
    let r = TestApp::new().post("/v1/convert", asset("dummy.docx")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert!(r.body.starts_with(b"%PDF-"));
  }

  #[tokio::test]
  async fn should_convert_pptx_to_pdf_per_default() {
    let r = TestApp::new().post("/v1/convert", asset("dummy.pptx")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 10);
  }

  #[tokio::test]
  async fn should_convert_docx_to_pdf_with_input_filter_output_filter_filter_options() {
    let uri = format!(
      "/v1/convert?inputFilter={}&outputFilter=writer_pdf_Export&filterOptions={}",
      encode("MS Word 2007 XML"),
      encode("PageRange=1-2")
    );
    let r = TestApp::new().post(&uri, asset("dummy.docx")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 1);
  }

  #[tokio::test]
  async fn should_convert_pptx_to_pdf_with_input_filter_output_filter_filter_options() {
    let uri = format!(
      "/v1/convert?outputFilter=impress_pdf_Export&filterOptions={}",
      encode("PageRange=1-2")
    );
    let r = TestApp::new().post(&uri, asset("dummy.pptx")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 2);
  }

  #[tokio::test]
  async fn should_convert_docx_to_pdf_with_index_and_log_flags() {
    let app = TestApp::new();
    for flag in ["updateIndex", "dontUpdateIndex", "verbose", "quiet"] {
      let r = app.post(&format!("/v1/convert?{flag}=true"), asset("dummy.docx")).await;
      assert_eq!(r.status, StatusCode::OK, "{flag}: {}", r.text());
      assert_eq!(r.pages(), 1, "{flag}");
    }
  }

  #[tokio::test]
  async fn should_convert_docx_to_pdf_with_convert_to() {
    let r = TestApp::new()
      .post("/v1/convert?convertTo=pdf", asset("dummy.docx"))
      .await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 1);
  }

  #[tokio::test]
  async fn should_convert_docx_to_images_with_convert_to() {
    let app = TestApp::new();
    for (to, mime, magic) in [
      ("png", "image/png", &b"\x89PNG"[..]),
      ("jpeg", "image/jpeg", &[0xFF, 0xD8, 0xFF][..]),
      ("webp", "image/webp", &b"RIFF"[..]),
    ] {
      let r = app
        .post(&format!("/v1/convert?convertTo={to}"), asset("dummy.docx"))
        .await;
      assert_eq!(r.status, StatusCode::OK, "{to}: {}", r.text());
      assert_eq!(r.content_type.as_deref(), Some(mime));
      assert!(r.body.starts_with(magic), "{to}");
    }
  }
}

/// unoserver-direct.spec.ts: `/direct`.
mod unoserver_direct {
  use super::*;

  fn json_option(name: &str, kind: &str, value: Value) -> String {
    encode(&json!({ name: { "type": kind, "value": value } }).to_string())
  }

  #[tokio::test]
  async fn should_convert_doc_to_pdf_per_default() {
    let r = TestApp::new()
      .post("/v1/direct", asset("VorlageBusinessplan.doc"))
      .await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 7);
  }

  #[tokio::test]
  async fn should_convert_doc_to_pdf_with_output_filter() {
    let r = TestApp::new()
      .post(
        "/v1/direct?outputFilter=writer_pdf_Export",
        asset("VorlageBusinessplan.doc"),
      )
      .await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 7);
  }

  #[tokio::test]
  async fn should_convert_doc_to_pdf_with_string_filter_options() {
    let app = TestApp::new();
    for (option, pages) in [("SelectPdfVersion=1", 7), ("PageRange=1-2", 2)] {
      let uri = format!(
        "/v1/direct?outputFilter=writer_pdf_Export&filterOptions={}",
        encode(option)
      );
      let r = app.post(&uri, asset("VorlageBusinessplan.doc")).await;
      assert_eq!(r.status, StatusCode::OK, "{option}");
      assert_eq!(r.pages(), pages, "{option}");
    }
  }

  #[tokio::test]
  async fn should_convert_doc_to_pdf_with_json_filter_options() {
    let app = TestApp::new();
    for (option, pages) in [
      (json_option("SelectPdfVersion", "long", json!(3)), 7),
      (json_option("PageRange", "string", json!("1-2")), 2),
    ] {
      let uri = format!("/v1/direct?outputFilter=writer_pdf_Export&filterOptions={option}");
      let r = app.post(&uri, asset("VorlageBusinessplan.doc")).await;
      assert_eq!(r.status, StatusCode::OK);
      assert_eq!(r.pages(), pages);
    }
  }

  #[tokio::test]
  async fn should_convert_pptx_to_pdf_with_json_page_range() {
    let option = json_option("PageRange", "string", json!("3-4"));
    let uri = format!("/v1/direct?outputFilter=writer_pdf_Export&filterOptions={option}");
    let r = TestApp::new().post(&uri, asset("dummy.pptx")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 2);
  }

  /// unoserver answers 404 for `/convert` in direct-only mode; here both always work.
  #[tokio::test]
  async fn convert_and_direct_are_both_available() {
    let app = TestApp::new();
    assert_eq!(
      app.post("/v1/convert", asset("dummy.docx")).await.status,
      StatusCode::OK
    );
    assert_eq!(app.post("/v1/direct", asset("dummy.docx")).await.status, StatusCode::OK);
  }

  #[tokio::test]
  async fn direct_rejects_convert_only_parameters() {
    let r = TestApp::new()
      .post("/v1/direct?updateIndex=true", asset("dummy.docx"))
      .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
  }
}

/// unoserver-direct-fs.spec.ts: `/direct-fs`.
mod unoserver_direct_fs {
  use super::*;

  struct Roots {
    input: PathBuf,
    output: PathBuf,
  }

  impl Roots {
    fn new() -> Self {
      let base = std::env::temp_dir().join(format!("office-pdf-test-{}", uuid::Uuid::new_v4()));
      let input = base.join("in");
      let output = base.join("out");
      std::fs::create_dir_all(&input).unwrap();
      std::fs::create_dir_all(&output).unwrap();
      std::fs::copy(
        asset_path("VorlageBusinessplan.doc"),
        input.join("VorlageBusinessplan.doc"),
      )
      .unwrap();
      Self { input, output }
    }

    fn app(&self) -> TestApp {
      TestApp::with(Config {
        fs_input_root: self.input.clone(),
        fs_output_root: self.output.clone(),
        ..Config::default()
      })
    }
  }

  impl Drop for Roots {
    fn drop(&mut self) {
      let _ = std::fs::remove_dir_all(self.input.parent().unwrap());
    }
  }

  #[tokio::test]
  async fn should_convert_file_from_fs_input_root_to_fs_output_root() {
    let roots = Roots::new();
    let r = roots
      .app()
      .post_json(
        "/v1/direct-fs",
        json!({
            "inputPath": "VorlageBusinessplan.doc",
            "outputPath": "converted/VorlageBusinessplan.pdf",
            "convertTo": "pdf",
        }),
      )
      .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    let json = r.json();
    assert_eq!(json["status"], "complete");
    assert_eq!(json["outputPath"], "converted/VorlageBusinessplan.pdf");
    assert!(json["outputBytes"].as_u64().unwrap() > 0);
    let written = std::fs::read(roots.output.join("converted/VorlageBusinessplan.pdf")).unwrap();
    assert_eq!(written.len() as u64, json["outputBytes"].as_u64().unwrap());
    assert!(written.starts_with(b"%PDF-"));
  }

  #[tokio::test]
  async fn should_reject_path_traversal_and_absolute_paths() {
    let roots = Roots::new();
    let app = roots.app();
    for input in ["../outside.doc", "/etc/passwd"] {
      let r = app
        .post_json(
          "/v1/direct-fs",
          json!({"inputPath": input, "outputPath": "converted/out.pdf", "convertTo": "pdf"}),
        )
        .await;
      assert_eq!(r.status, StatusCode::BAD_REQUEST, "{input}");
      assert_eq!(r.json()["status"], "error");
    }
    let r = app
      .post_json(
        "/v1/direct-fs",
        json!({"inputPath": "VorlageBusinessplan.doc", "outputPath": "../escape.pdf"}),
      )
      .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
  }

  #[tokio::test]
  async fn should_reject_missing_input_file() {
    let roots = Roots::new();
    let r = roots
      .app()
      .post_json(
        "/v1/direct-fs",
        json!({"inputPath": "does-not-exist.doc", "outputPath": "converted/out.pdf", "convertTo": "pdf"}),
      )
      .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    let json = r.json();
    assert_eq!(json["status"], "error");
    assert!(
      json["message"]
        .as_str()
        .unwrap()
        .contains("Input file not found or not readable")
    );
  }

  #[tokio::test]
  async fn should_reject_invalid_body() {
    let roots = Roots::new();
    let app = roots.app();
    let r = app.post_json("/v1/direct-fs", json!({"inputPath": "x.doc"})).await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    assert_eq!(r.json()["status"], "error");
    let r = app
      .post_json(
        "/v1/direct-fs",
        json!({"inputPath": "VorlageBusinessplan.doc", "outputPath": "o.pdf", "filterOptions": "PageRange=1"}),
      )
      .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST, "filterOptions needs outputFilter");
  }

  #[tokio::test]
  async fn applies_filter_options() {
    let roots = Roots::new();
    let r = roots
      .app()
      .post_json(
        "/v1/direct-fs",
        json!({
            "inputPath": "VorlageBusinessplan.doc",
            "outputPath": "two.pdf",
            "outputFilter": "writer_pdf_Export",
            "filterOptions": ["PageRange=1-2"],
        }),
      )
      .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    let written = std::fs::read(roots.output.join("two.pdf")).unwrap();
    assert_eq!(lopdf::Document::load_mem(&written).unwrap().get_pages().len(), 2);
  }
}

/// unoserver-process.spec.ts and @riwi/test/bun's process endpoint tests: `/processes`.
mod unoserver_processes {
  use super::*;

  const NON_EXISTENT_UUID: &str = "00000000-0000-0000-0000-000000000000";

  async fn list(app: &TestApp, query: &str) -> Value {
    let r = app.call(Method::GET, &format!("/v1/processes{query}")).await;
    assert_eq!(r.status, StatusCode::OK);
    r.json()
  }

  #[tokio::test]
  async fn should_list_processes_with_summary() {
    let json = list(&TestApp::new(), "").await;
    assert!(json["processes"].as_array().unwrap().is_empty());
    for key in ["running", "completed", "failed", "killed"] {
      assert!(json["summary"][key].is_u64(), "{key}");
    }
  }

  #[tokio::test]
  async fn should_show_get_filter_and_clear_processes() {
    let app = TestApp::new();
    assert_eq!(
      app.post("/v1/convert", asset("dummy.docx")).await.status,
      StatusCode::OK
    );
    assert_eq!(
      app.post("/v1/direct", asset("VorlageBusinessplan.doc")).await.status,
      StatusCode::OK
    );

    let json = list(&app, "").await;
    let processes = json["processes"].as_array().unwrap();
    assert_eq!(processes.len(), 2);
    let first = &processes[0];
    for key in ["id", "command", "args", "pid", "status", "startTime", "endTime"] {
      assert!(!first[key].is_null(), "{key}");
    }
    assert_eq!(first["command"], "wordcraft");
    assert_eq!(first["status"], "completed");
    assert_eq!(first["exitCode"], 0);

    let completed = list(&app, "?status=completed").await;
    assert!(
      completed["processes"]
        .as_array()
        .unwrap()
        .iter()
        .all(|p| p["status"] == "completed")
    );

    let id = first["id"].as_str().unwrap();
    let r = app.call(Method::GET, &format!("/v1/processes/{id}")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.json()["id"], id);

    let r = app.call(Method::DELETE, "/v1/processes?olderThan=60000").await;
    assert_eq!(r.json()["cleared"], 0, "too recent to clear");
    let r = app.call(Method::DELETE, "/v1/processes").await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.json()["cleared"], 2);
    assert!(list(&app, "").await["processes"].as_array().unwrap().is_empty());
  }

  #[tokio::test]
  async fn should_return_404_for_unknown_ids() {
    let app = TestApp::new();
    for method in [Method::GET, Method::DELETE] {
      for id in [NON_EXISTENT_UUID, "not-a-uuid"] {
        let r = app.call(method.clone(), &format!("/v1/processes/{id}")).await;
        assert_eq!(r.status, StatusCode::NOT_FOUND, "{method} {id}");
      }
    }
  }

  #[tokio::test]
  async fn should_reject_invalid_status_filter() {
    let r = TestApp::new().call(Method::GET, "/v1/processes?status=sleeping").await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
  }

  #[tokio::test]
  async fn should_track_failed_processes() {
    let app = TestApp::new();
    let r = app
      .post(
        "/v1/direct?outputFilter=invalid_filter_name",
        asset("VorlageBusinessplan.doc"),
      )
      .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    let failed = list(&app, "?status=failed").await;
    let processes = failed["processes"].as_array().unwrap();
    assert_eq!(processes.len(), 1);
    assert_eq!(processes[0]["exitCode"], 1);
    assert!(processes[0]["endTime"].is_string());
    assert_eq!(list(&app, "").await["summary"]["failed"], 1);
  }

  #[tokio::test]
  async fn should_mark_timed_out_process_as_killed() {
    let app = TestApp::new();
    let r = app
      .post("/v1/direct?timeoutMs=1", asset("VorlageBusinessplan.doc"))
      .await;
    assert_eq!(r.status, StatusCode::GATEWAY_TIMEOUT);
    let killed = list(&app, "?status=killed").await;
    let processes = killed["processes"].as_array().unwrap();
    assert_eq!(processes.len(), 1);
    assert_eq!(processes[0]["signal"], "SIGKILL");
    assert!(processes[0]["endTime"].is_string());
  }

  #[tokio::test]
  async fn should_kill_a_running_process() {
    // One conversion slot, taken by a slow conversion: the second request waits for it and
    // is the one killed while running.
    let app = TestApp::with(Config {
      max_concurrent_conversions: 1,
      ..Config::default()
    });
    let big = "Lorem ipsum dolor sit amet. ".repeat(20_000).into_bytes();
    let slow = tokio::spawn({
      let router = app.router.clone();
      let big = big.clone();
      async move { TestApp { router }.post("/v1/convert?format=txt", big).await }
    });
    let queued = tokio::spawn({
      let router = app.router.clone();
      async move { TestApp { router }.post("/v1/convert?format=txt", big).await }
    });

    // Both started; the later one is waiting for the slot (or converting): kill it.
    let id = loop {
      let all = list(&app, "").await;
      let processes = all["processes"].as_array().unwrap().clone();
      if processes.len() == 2 {
        assert_eq!(processes[1]["status"], "running");
        break processes[1]["id"].as_str().unwrap().to_string();
      }
      tokio::time::sleep(Duration::from_millis(5)).await;
    };
    let r = app
      .call(Method::DELETE, &format!("/v1/processes/{id}?signal=SIGTERM"))
      .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    let json = r.json();
    assert_eq!(json["success"], true);
    assert_eq!(json["process"]["status"], "killed");
    assert_eq!(json["process"]["signal"], "SIGTERM");

    let killed = queued.await.unwrap();
    assert_eq!(killed.status, StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(killed.error(), "conversion was killed");
    slow.abort();

    let r = app.call(Method::DELETE, &format!("/v1/processes/{id}")).await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    assert_eq!(r.json()["error"], "Process is not running");
  }
}

/// Beyond unoserver: spreadsheets, formats, errors, versioning, OpenAPI.
mod api {
  use super::*;

  #[tokio::test]
  async fn health() {
    let app = TestApp::new();
    for path in ["/health/liveness", "/health/readiness"] {
      let r = app.call(Method::GET, path).await;
      assert_eq!(r.status, StatusCode::OK);
      assert_eq!(r.body, b"ok");
    }
  }

  #[tokio::test]
  async fn converts_spreadsheets() {
    let app = TestApp::new();
    let r = app.post("/v1/convert", xlsx()).await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    assert_eq!(r.pages(), 1);
    let r = app.post("/v1/convert?format=csv", b"a,b\n1,2\n".to_vec()).await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    assert!(r.body.starts_with(b"%PDF-"));
    let r = app.post("/v1/convert?convertTo=png", xlsx()).await;
    assert_eq!(r.status, StatusCode::UNSUPPORTED_MEDIA_TYPE);
  }

  #[tokio::test]
  async fn takes_the_format_from_content_type() {
    let r = TestApp::new()
      .post_typed("/v1/convert", DOCX, asset("dummy.docx"))
      .await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 1);
  }

  #[tokio::test]
  async fn converts_markdown() {
    let r = TestApp::new()
      .post("/v1/convert?format=md", b"# Title\n\nSome *text*.".to_vec())
      .await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.pages(), 1);
  }

  #[tokio::test]
  async fn rejects_invalid_requests_with_json_errors() {
    let app = TestApp::new();
    let cases = [
      (
        "/v1/convert",
        Vec::new(),
        StatusCode::BAD_REQUEST,
        "request body is empty",
      ),
      (
        "/v1/convert?nope=1",
        asset("dummy.docx"),
        StatusCode::BAD_REQUEST,
        "nope",
      ),
      (
        "/v1/convert?convertTo=gif",
        asset("dummy.docx"),
        StatusCode::BAD_REQUEST,
        "gif",
      ),
      (
        "/v1/convert?timeoutMs=0",
        asset("dummy.docx"),
        StatusCode::BAD_REQUEST,
        "timeoutMs",
      ),
      (
        "/v1/convert?filterOptions=PageRange%3D1",
        asset("dummy.docx"),
        StatusCode::BAD_REQUEST,
        "outputFilter",
      ),
      (
        "/v1/convert?convertTo=png&outputFilter=writer_pdf_Export",
        asset("dummy.docx"),
        StatusCode::BAD_REQUEST,
        "writes pdf",
      ),
      (
        "/v1/convert?outputFilter=writer_pdf_Export&filterOptions=PageRange%3D5-6",
        asset("dummy.docx"),
        StatusCode::BAD_REQUEST,
        "selects none",
      ),
      (
        "/v1/convert?inputFilter=Nonsense",
        asset("dummy.docx"),
        StatusCode::BAD_REQUEST,
        "unsupported filter",
      ),
      (
        "/v1/convert?format=exe",
        b"MZ".to_vec(),
        StatusCode::UNSUPPORTED_MEDIA_TYPE,
        "exe",
      ),
      (
        "/v1/convert?format=docx",
        b"PK\x03\x04 not a zip".to_vec(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "cannot read",
      ),
    ];
    for (uri, body, status, message) in cases {
      let r = app.post(uri, body).await;
      assert_eq!(r.status, status, "{uri}: {}", r.text());
      assert!(r.error().contains(message), "{uri}: {}", r.error());
    }
  }

  #[tokio::test]
  async fn enforces_body_limit() {
    let app = TestApp::with(Config {
      max_body_bytes: 16,
      ..Config::default()
    });
    let r = app.post("/v1/convert?format=txt", vec![b'a'; 64]).await;
    assert_eq!(r.status, StatusCode::PAYLOAD_TOO_LARGE);
    assert!(r.error().contains("length limit"));
  }

  #[tokio::test]
  async fn unversioned_paths_are_not_served() {
    let app = TestApp::new();
    for path in ["/convert", "/direct", "/direct-fs"] {
      assert_eq!(
        app.post(path, asset("dummy.docx")).await.status,
        StatusCode::NOT_FOUND,
        "{path}"
      );
    }
    assert_eq!(app.call(Method::GET, "/processes").await.status, StatusCode::NOT_FOUND);
  }

  #[tokio::test]
  async fn serves_openapi() {
    let r = TestApp::new().call(Method::GET, "/v1/openapi.json").await;
    assert_eq!(r.status, StatusCode::OK);
    let doc = r.json();
    assert_eq!(doc["openapi"], "3.1.0");
    assert_eq!(doc["info"]["version"], env!("CARGO_PKG_VERSION"));
    let paths = doc["paths"].as_object().unwrap();
    for path in [
      "/v1/convert",
      "/v1/direct",
      "/v1/direct-fs",
      "/v1/processes",
      "/v1/processes/{id}",
      "/v1/openapi.json",
      "/v1/pdf-to-text",
      "/v1/pdf-to-html",
      "/v1/pdf-to-image",
      "/v1/compress",
      "/v1/uncompress",
      "/v1/encrypt",
      "/v1/decrypt",
      "/v1/data/fields",
      "/v1/data/dump",
      "/v1/data/annots",
      "/v1/data/fdf",
      "/v1/form/fill",
      "/v1/cat",
      "/v1/split",
      "/v1/merge",
      "/v1/rotate",
      "/v1/stamp",
      "/v1/background",
    ] {
      assert!(paths.contains_key(path), "{path} missing");
    }
    // Everything but the container probes is versioned, and every response is described.
    for (path, item) in paths {
      assert!(
        path.starts_with("/v1/") || path.starts_with("/health/"),
        "unversioned path {path}"
      );
      for (method, operation) in item.as_object().unwrap() {
        for (code, response) in operation["responses"].as_object().unwrap() {
          assert!(
            response["description"].is_string(),
            "{method} {path} {code} has no description"
          );
        }
      }
    }
  }
}
