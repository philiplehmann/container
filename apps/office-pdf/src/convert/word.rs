//! Text documents with WordCraft.

use serde_json::json;
use wordcraft_engine::io::{self, ExportOptions};
use wordcraft_engine::{CmdError, Session};

use super::{ConvertError, Output};

pub struct WordOptions<'a> {
  pub password: Option<&'a str>,
  pub update_index: bool,
  pub markup: bool,
  pub strict: bool,
}

/// The first page is rendered for an image; `page` picks another (1-based).
pub fn convert(name: &str, bytes: &[u8], output: Output, options: &WordOptions) -> Result<Vec<u8>, ConvertError> {
  let region = wordcraft_engine::Region::default();
  let (doc, _encrypted) = io::open_bytes_in(name, bytes, options.password, &region).map_err(|e| {
    if io::wrong_password(&e) {
      ConvertError::WrongPassword
    } else if io::needs_password(&e) {
      ConvertError::PasswordRequired
    } else {
      ConvertError::Read(e)
    }
  })?;
  let mut session = Session::new(doc);
  if options.update_index {
    // Tables of contents and other fields; protection may forbid it, which is not an error.
    match session.run("references.updateFields", &json!({})) {
      Ok(_) | Err(CmdError::Disabled(_)) => {}
      Err(e) => return Err(ConvertError::Read(e.to_string())),
    }
  }
  let export = ExportOptions {
    markup: options.markup,
    comments: options.markup,
    strict: options.strict,
    ..ExportOptions::default()
  };
  match output {
    Output::Pdf => io::save_bytes_opts("output.pdf", &session.doc, &export).map_err(write_error),
    Output::Image { page } => {
      // The page image export writes a file; keep it in the temp dir for this call only.
      let path = std::env::temp_dir().join(format!("office-pdf-{}.png", uuid::Uuid::new_v4()));
      let path_str = path.to_string_lossy().to_string();
      let result = session
        .run(
          "file.exportPng",
          &json!({"path": path_str, "page": page, "scale": 2.0, "markup": options.markup, "strict": options.strict}),
        )
        .map_err(|e| match e {
          CmdError::Params(m) => ConvertError::InvalidOption(m),
          other => write_error(other.to_string()),
        })
        .and_then(|_| std::fs::read(&path).map_err(|e| ConvertError::Write(e.to_string())));
      let _ = std::fs::remove_file(&path);
      result
    }
  }
}

fn write_error(e: String) -> ConvertError {
  if e.starts_with("strict: ") {
    ConvertError::Strict(e)
  } else {
    ConvertError::Write(e)
  }
}
