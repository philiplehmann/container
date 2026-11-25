//! Presentations with DeckCraft.

use deckcraft_engine::cmd::file;

use super::{ConvertError, Output};

pub fn convert(name: &str, bytes: &[u8], output: Output) -> Result<Vec<u8>, ConvertError> {
  let presentation = file::open_presentation(name, bytes).map_err(|e| {
    let message = e.to_string();
    if message.contains("password-protected") {
      ConvertError::PasswordUnsupported(message)
    } else {
      ConvertError::Read(message)
    }
  })?;
  match output {
    Output::Pdf => file::save_bytes(&presentation, "pdf").map_err(|e| ConvertError::Write(e.to_string())),
    Output::Image { page } => {
      let count = presentation.slides.len();
      let index = (page as usize)
        .checked_sub(1)
        .filter(|i| *i < count)
        .ok_or_else(|| ConvertError::InvalidOption(format!("no slide {page}, the presentation has {count}")))?;
      let (png, _, _) = file::render_png(&presentation, index, 2.0, false);
      Ok(png)
    }
  }
}
