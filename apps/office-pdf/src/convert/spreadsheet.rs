//! Spreadsheets with GridCraft.

use gridcraft_engine::{DocState, Session, Trust};
use serde_json::json;

use super::{ConvertError, Output};

pub fn convert(name: &str, bytes: &[u8], output: Output, password: Option<&str>) -> Result<Vec<u8>, ConvertError> {
  let (workbook, _warnings) = gridcraft_engine::io::open_bytes_with_password(name, bytes, password).map_err(|e| {
    let message = e.to_string();
    if message.contains(gridcraft_engine::io::WRONG_PASSWORD) {
      ConvertError::WrongPassword
    } else if message.contains(gridcraft_engine::io::PASSWORD_REQUIRED) {
      ConvertError::PasswordRequired
    } else {
      ConvertError::Read(message)
    }
  })?;
  if let Output::Image { .. } = output {
    return Err(ConvertError::UnsupportedOutput(
      "spreadsheets can only be converted to pdf".into(),
    ));
  }
  let mut session = Session::new();
  // From a file: macros and other active content never run.
  session.add_document(DocState::from_saved(workbook, None, "input".into(), Trust::FromFile));
  let result = session
    .execute_headless("file.exportPdf", json!({}))
    .map_err(|e| ConvertError::Write(e.to_string()))?;
  result["base64"]
    .as_str()
    .and_then(gridcraft_engine::io::base64_decode)
    .ok_or_else(|| ConvertError::Write("spreadsheet pdf export returned no data".into()))
}
