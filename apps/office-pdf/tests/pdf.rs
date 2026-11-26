//! PDF tool tests. `poppler` and `pdftk` port the poppler and pdftk images' suites
//! (apps/poppler/src/test, apps/pdftk/src/test) to the `/v1` API, with their fixtures and
//! snapshots; `tools` covers the operations those images don't expose.

mod common;

use axum::http::{Method, StatusCode};
use common::*;
use serde_json::Value;

fn snapshot(name: &str) -> Value {
  let path = format!("{}/tests/snapshots/{name}", env!("CARGO_MANIFEST_DIR"));
  serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

fn page_text(pdf: &[u8], page: u32) -> String {
  let doc = lopdf::Document::load_mem(pdf).unwrap();
  doc.extract_text(&[page]).unwrap_or_default()
}

/// The 7 page PDF of the unoserver fixture, made by this server.
async fn seven_pages(app: &TestApp) -> Vec<u8> {
  let r = app.post("/v1/convert", asset("VorlageBusinessplan.doc")).await;
  assert_eq!(r.pages(), 7);
  r.body
}

/// poppler.spec.ts
mod poppler {
  use super::*;

  #[tokio::test]
  async fn should_convert_pdf_to_text() {
    let r = TestApp::new()
      .post_typed("/v1/pdf-to-text", "application/pdf", asset("dummy.pdf"))
      .await;
    assert_eq!(r.status, StatusCode::OK);
    assert!(r.text().contains("Dummy PDF file"), "{}", r.text());
    assert_eq!(r.content_type.as_deref(), Some("text/plain; charset=utf-8"));
  }

  #[tokio::test]
  async fn should_convert_pdf_to_html_and_include_dummy_pdf_file() {
    let r = TestApp::new()
      .post_typed(
        "/v1/pdf-to-html",
        "application/x-www-form-urlencoded",
        asset("dummy.pdf"),
      )
      .await;
    assert_eq!(r.status, StatusCode::OK);
    assert!(r.text().contains("Dummy PDF file"));
    assert!(r.text().to_lowercase().contains("<!doctype html>"));
  }

  #[tokio::test]
  async fn extracts_selected_pages_with_page_breaks() {
    let app = TestApp::new();
    let pdf = seven_pages(&app).await;
    let all = app.post("/v1/pdf-to-text", pdf.clone()).await.text();
    assert_eq!(all.matches('\u{c}').count(), 7, "one form feed per page");
    assert!(all.starts_with("Businessplan"), "{all}");
    let two = app.post("/v1/pdf-to-text?pages=2-3", pdf).await.text();
    assert_eq!(two.matches('\u{c}').count(), 2);
  }

  #[tokio::test]
  async fn renders_pages_as_images() {
    let app = TestApp::new();
    let r = app.post("/v1/pdf-to-image?dpi=72", asset("dummy.pdf")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.content_type.as_deref(), Some("image/png"));
    let image = image::load_from_memory(&r.body).unwrap();
    // A4 (595.28 x 841.89 pt) at 72 dpi.
    assert_eq!(image.width(), 595);
    assert!((841..=842).contains(&image.height()));

    let pdf = seven_pages(&app).await;
    let r = app.post("/v1/pdf-to-image?pages=1-3&convertTo=jpeg&dpi=30", pdf).await;
    assert_eq!(r.content_type.as_deref(), Some("application/zip"));
    let names: Vec<String> = office_pdf::pdf::zip::unzip(&r.body)
      .into_iter()
      .map(|(n, _)| n)
      .collect();
    assert_eq!(names, ["page-1.jpg", "page-2.jpg", "page-3.jpg"]);
  }

  #[tokio::test]
  async fn rejects_bad_input() {
    let app = TestApp::new();
    let r = app.post("/v1/pdf-to-text", asset("dummy.docx")).await;
    assert_eq!(r.status, StatusCode::UNPROCESSABLE_ENTITY);
    let r = app.post("/v1/pdf-to-text?pages=5", asset("dummy.pdf")).await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    let r = app.post("/v1/pdf-to-image?dpi=5000", asset("dummy.pdf")).await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    let r = app.post("/v1/pdf-to-image?convertTo=pdf", asset("dummy.pdf")).await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
  }
}

/// pdftk.spec.ts
mod pdftk {
  use super::*;

  const FILL: &str = "Group6=true&Check%20Box1=false&Check%20Box2=true&Check%20Box3=false&Check%20Box4=true\
        &Dropdown1=20&Dropdown2=Jun&Dropdown3=2018&Address=123%20Main%20St&Name=John%20Doe&flag=need_appearances";

  /// The pdftk image's snapshot, with the two places where this server answers differently:
  /// `Button7` keeps the tooltip of its field (pdftk drops it when a field has several
  /// widgets), and `Group6=true` selects the radio group's choice (the pdftk image maps
  /// `true` to the second state name, which is `Off` for this group).
  fn pdftk_snapshot(name: &str, group6: Option<&str>) -> Value {
    let mut fields = snapshot(name);
    for field in fields.as_array_mut().unwrap() {
      if field["name"] == "Button7" {
        field["title"] = "Click here to save this document".into();
      }
      if let (true, Some(value)) = (field["name"] == "Group6", group6) {
        field["value"] = value.into();
      }
    }
    fields
  }

  #[tokio::test]
  async fn compress_reduces_the_size() {
    let r = TestApp::new().post("/v1/compress", asset("uncompressed.pdf")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert!(r.body.len() < asset("uncompressed.pdf").len());
    assert_eq!(r.pages(), 1);
  }

  #[tokio::test]
  async fn uncompress_increases_the_size() {
    let r = TestApp::new().post("/v1/uncompress", asset("compressed.pdf")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert!(r.body.len() > asset("compressed.pdf").len());
    assert_eq!(r.pages(), 1);
  }

  #[tokio::test]
  async fn encrypt_with_owner_user_password_and_permissions() {
    let app = TestApp::new();
    for query in [
      "password=1234",
      "password=1234&userPassword=5678",
      "password=1234&userPassword=5678&allow=AllFeatures",
    ] {
      let r = app.post(&format!("/v1/encrypt?{query}"), asset("form.pdf")).await;
      assert_eq!(r.status, StatusCode::OK, "{query}: {}", r.text());
      assert!(String::from_utf8_lossy(&r.body).contains("/Encrypt"), "{query}");
    }
  }

  #[tokio::test]
  async fn encryption_round_trips_for_every_algorithm() {
    let app = TestApp::new();
    for algorithm in ["aes256", "aes128", "128bit", "40bit"] {
      let r = app
        .post(
          &format!("/v1/encrypt?password=owner&userPassword=user&encryption={algorithm}&allow=Printing&allow=FillIn"),
          asset("dummy.pdf"),
        )
        .await;
      assert_eq!(r.status, StatusCode::OK, "{algorithm}: {}", r.text());
      let locked = r.body;
      // A user password is needed now.
      let r = app.post("/v1/pdf-to-text", locked.clone()).await;
      assert_eq!(r.status, StatusCode::UNAUTHORIZED, "{algorithm}");
      let r = app.post("/v1/decrypt?password=wrong", locked.clone()).await;
      assert_eq!(r.status, StatusCode::UNAUTHORIZED, "{algorithm}");
      let r = app.post("/v1/decrypt?password=user", locked).await;
      assert_eq!(r.status, StatusCode::OK, "{algorithm}");
      assert!(!String::from_utf8_lossy(&r.body).contains("/Encrypt"));
      let r = app.post("/v1/pdf-to-text", r.body).await;
      assert!(r.text().contains("Dummy PDF file"), "{algorithm}");
    }
  }

  #[tokio::test]
  async fn encrypt_needs_a_password() {
    let r = TestApp::new().post("/v1/encrypt", asset("form.pdf")).await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    let r = TestApp::new()
      .post("/v1/encrypt?password=1&allow=Everything", asset("form.pdf"))
      .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
  }

  #[tokio::test]
  async fn decrypt_removes_the_encryption() {
    let r = TestApp::new()
      .post("/v1/decrypt?password=1234", asset("encrypted.pdf"))
      .await;
    assert_eq!(r.status, StatusCode::OK);
    assert!(!String::from_utf8_lossy(&r.body).contains("/Encrypt"));
    assert_eq!(r.pages(), 1);
  }

  #[tokio::test]
  async fn returns_data_fields() {
    let r = TestApp::new().post("/v1/data/fields", asset("form.pdf")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.json(), pdftk_snapshot("dataFields.json", None));
  }

  #[tokio::test]
  async fn returns_data_dump() {
    let r = TestApp::new().post("/v1/data/dump", asset("form.pdf")).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.json(), snapshot("dataDump.json"));
  }

  #[tokio::test]
  async fn returns_generated_fdf() {
    let r = TestApp::new().post("/v1/data/fdf", asset("form.pdf")).await;
    assert_eq!(r.status, StatusCode::OK);
    let fdf = r.text();
    assert!(fdf.starts_with("%FDF-1.2"));
    assert!(fdf.trim_end().ends_with("%%EOF"));
    // The same fields as pdftk's FDF, with their values.
    for field in snapshot("dataFields.json").as_array().unwrap() {
      assert!(
        fdf.contains(&format!("/T ({})", field["name"].as_str().unwrap())),
        "{field}"
      );
    }
    assert!(fdf.contains("/T (Dropdown3)\n/V (2012)"));
  }

  #[tokio::test]
  async fn fills_the_form_and_checks_the_values_afterwards() {
    let app = TestApp::new();
    let r = app.post(&format!("/v1/form/fill?{FILL}"), asset("form.pdf")).await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    let r = app.post("/v1/data/fields", r.body).await;
    assert_eq!(r.json(), pdftk_snapshot("formFill.json", Some("Choice1")));
  }

  #[tokio::test]
  async fn flattens_the_form() {
    let app = TestApp::new();
    let r = app
      .post(
        &format!("/v1/form/fill?{}", FILL.replace("need_appearances", "flatten")),
        asset("form.pdf"),
      )
      .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    let flat = r.body;
    assert_eq!(
      app.post("/v1/data/fields", flat.clone()).await.json(),
      Value::Array(vec![])
    );
    let text = app.post("/v1/pdf-to-text", flat).await.text();
    assert!(text.contains("John Doe") && text.contains("123 Main St"), "{text}");
  }

  #[tokio::test]
  async fn fills_with_a_replacement_font() {
    let app = TestApp::new();
    let r = app
      .post(
        "/v1/form/fill?Name=Jane&flag=replacement_font&fontName=Courier-Bold",
        asset("form.pdf"),
      )
      .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    assert!(String::from_utf8_lossy(&r.body).contains("/Courier-Bold"));
    let r = app
      .post(
        "/v1/form/fill?Name=Jane&flag=replacement_font&fontName=Comic",
        asset("form.pdf"),
      )
      .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    let r = app
      .post("/v1/form/fill?Name=Jane&flag=replacement_font", asset("form.pdf"))
      .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
  }

  #[tokio::test]
  async fn rejects_invalid_button_values_and_ignores_unknown_fields() {
    let app = TestApp::new();
    let r = app.post("/v1/form/fill?Check%20Box1=maybe", asset("form.pdf")).await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    assert!(r.error().contains("Yes"));
    let r = app
      .post("/v1/form/fill?NoSuchField=1&Group6=Choice1", asset("form.pdf"))
      .await;
    assert_eq!(r.status, StatusCode::OK);
    let fields = app.post("/v1/data/fields", r.body).await.json();
    let group6 = fields
      .as_array()
      .unwrap()
      .iter()
      .find(|f| f["name"] == "Group6")
      .unwrap()
      .clone();
    assert_eq!(group6["value"], "Choice1");
  }

  #[tokio::test]
  async fn lists_annotations() {
    let r = TestApp::new().post("/v1/data/annots", asset("form.pdf")).await;
    assert_eq!(r.status, StatusCode::OK);
    let annots = r.json();
    let annots = annots.as_array().unwrap();
    assert!(
      annots
        .iter()
        .any(|a| a["subtype"] == "Widget" && a["fieldName"] == "Name")
    );
    assert!(annots.iter().all(|a| a["page"] == 1));
  }

  #[tokio::test]
  async fn rejects_non_pdf_input() {
    let app = TestApp::new();
    for path in [
      "/v1/compress",
      "/v1/uncompress",
      "/v1/data/fields",
      "/v1/data/dump",
      "/v1/decrypt",
    ] {
      let r = app.post(path, asset("dummy.docx")).await;
      assert_eq!(r.status, StatusCode::UNPROCESSABLE_ENTITY, "{path}");
      assert_eq!(
        app.post(path, Vec::new()).await.status,
        StatusCode::BAD_REQUEST,
        "{path}"
      );
    }
  }
}

/// pdftk operations the pdftk image doesn't expose.
mod tools {
  use super::*;

  #[tokio::test]
  async fn cat_selects_and_reorders_pages() {
    let app = TestApp::new();
    let pdf = seven_pages(&app).await;
    let r = app.post("/v1/cat?pages=7,1-2,1", pdf.clone()).await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    assert_eq!(r.pages(), 4);
    for (out, original) in [(1, 7), (2, 1), (3, 2), (4, 1)] {
      assert_eq!(page_text(&r.body, out), page_text(&pdf, original), "page {out}");
    }
    let r = app.post("/v1/cat?pages=r1-r3", pdf.clone()).await;
    assert_eq!(r.pages(), 3);
    assert_eq!(page_text(&r.body, 1), page_text(&pdf, 7));
    assert_eq!(
      app.post("/v1/cat?pages=9", pdf.clone()).await.status,
      StatusCode::BAD_REQUEST
    );
    assert_eq!(app.post("/v1/cat", pdf).await.status, StatusCode::BAD_REQUEST);
  }

  #[tokio::test]
  async fn split_bursts_pages_or_ranges() {
    let app = TestApp::new();
    let pdf = seven_pages(&app).await;
    let r = app.post("/v1/split", pdf.clone()).await;
    assert_eq!(r.content_type.as_deref(), Some("application/zip"));
    let files = office_pdf::pdf::zip::unzip(&r.body);
    assert_eq!(files.len(), 7);
    assert_eq!(files[0].0, "pg_0001.pdf");
    assert_eq!(page_text(&files[6].1, 1), page_text(&pdf, 7));

    let r = app.post("/v1/split?range=1-2&range=3-end", pdf.clone()).await;
    let pages: Vec<(String, usize)> = office_pdf::pdf::zip::unzip(&r.body)
      .into_iter()
      .map(|(n, b)| (n, lopdf::Document::load_mem(&b).unwrap().get_pages().len()))
      .collect();
    assert_eq!(
      pages,
      [("part_0001.pdf".to_string(), 2), ("part_0002.pdf".to_string(), 5)]
    );

    let r = app.post("/v1/split?every=3", pdf.clone()).await;
    assert_eq!(office_pdf::pdf::zip::unzip(&r.body).len(), 3);
    assert_eq!(app.post("/v1/split?every=0", pdf).await.status, StatusCode::BAD_REQUEST);
  }

  #[tokio::test]
  async fn merges_files_in_order() {
    let app = TestApp::new();
    let pdf = seven_pages(&app).await;
    let r = app
      .post_multipart(
        "/v1/merge",
        &[("a", asset("dummy.pdf")), ("b", pdf.clone()), ("c", asset("form.pdf"))],
      )
      .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    assert_eq!(r.pages(), 9);
    assert!(page_text(&r.body, 1).contains("Dummy PDF file"));
    assert_eq!(page_text(&r.body, 8), page_text(&pdf, 7));
    // The form of the last file still works.
    let fields = app.post("/v1/data/fields", r.body).await.json();
    assert_eq!(fields.as_array().unwrap().len(), 13);
    assert_eq!(
      app.post_multipart("/v1/merge", &[]).await.status,
      StatusCode::BAD_REQUEST
    );
    assert_eq!(
      app.post("/v1/merge", asset("dummy.pdf")).await.status,
      StatusCode::BAD_REQUEST
    );
  }

  #[tokio::test]
  async fn rotates_pages() {
    let app = TestApp::new();
    let pdf = seven_pages(&app).await;
    let r = app.post("/v1/rotate?angle=90&pages=1-2", pdf.clone()).await;
    assert_eq!(r.status, StatusCode::OK);
    let dump = app.post("/v1/data/dump", r.body.clone()).await.json();
    let rotations: Vec<i64> = dump["pages"]
      .as_array()
      .unwrap()
      .iter()
      .map(|p| p["rotation"].as_i64().unwrap())
      .collect();
    assert_eq!(rotations, [90, 90, 0, 0, 0, 0, 0]);
    let r = app.post("/v1/rotate?angle=-90", r.body).await;
    let dump = app.post("/v1/data/dump", r.body).await.json();
    assert_eq!(dump["pages"][0]["rotation"], 0);
    assert_eq!(dump["pages"][2]["rotation"], 270);
    assert_eq!(
      app.post("/v1/rotate?angle=45", pdf).await.status,
      StatusCode::BAD_REQUEST
    );
  }

  #[tokio::test]
  async fn stamps_and_backgrounds() {
    let app = TestApp::new();
    let pdf = seven_pages(&app).await;
    let r = app
      .post_multipart("/v1/stamp", &[("file", pdf.clone()), ("stamp", asset("dummy.pdf"))])
      .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    assert_eq!(r.pages(), 7);
    let text = app.post("/v1/pdf-to-text?pages=5", r.body).await.text();
    assert!(text.contains("Dummy PDF file"), "{text}");

    // multi: overlay page n on page n only (the background has one page).
    let r = app
      .post_multipart(
        "/v1/background?multi=true",
        &[("file", pdf.clone()), ("background", asset("form.pdf"))],
      )
      .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text());
    assert!(
      app
        .post("/v1/pdf-to-text?pages=1", r.body.clone())
        .await
        .text()
        .contains("Fillable")
    );
    assert!(
      !app
        .post("/v1/pdf-to-text?pages=2", r.body)
        .await
        .text()
        .contains("Fillable")
    );

    let r = app.post_multipart("/v1/stamp", &[("file", pdf)]).await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST);
    assert!(r.error().contains("stamp"));
  }

  #[tokio::test]
  async fn pdf_jobs_are_listed_as_processes() {
    let app = TestApp::new();
    app.post("/v1/compress", asset("dummy.pdf")).await;
    app.post("/v1/pdf-to-text", asset("dummy.pdf")).await;
    app.post("/v1/data/fields", asset("dummy.docx")).await;
    let list = app.call(Method::GET, "/v1/processes").await.json();
    let commands: Vec<(&str, &str)> = list["processes"]
      .as_array()
      .unwrap()
      .iter()
      .map(|p| (p["command"].as_str().unwrap(), p["status"].as_str().unwrap()))
      .collect();
    assert_eq!(
      commands,
      [("pdftk", "completed"), ("pdftotext", "completed"), ("pdftk", "failed")]
    );
  }

  #[tokio::test]
  async fn times_out_like_the_converters() {
    let app = TestApp::new();
    let r = app.post("/v1/uncompress?timeoutMs=1", asset("uncompressed.pdf")).await;
    assert_eq!(r.status, StatusCode::GATEWAY_TIMEOUT);
    let killed = app.call(Method::GET, "/v1/processes?status=killed").await.json();
    assert_eq!(killed["processes"].as_array().unwrap().len(), 1);
  }
}
