//! Office documents to PDF or images with ArtCraft's engines, in process: WordCraft for text
//! documents, DeckCraft for presentations, GridCraft for spreadsheets.

pub mod detect;
pub mod filters;
mod pdf;
mod presentation;
mod spreadsheet;
mod word;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub use detect::Engine;
use filters::FilterOptions;

/// What a conversion produces (unoserver's `convertTo`).
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum OutputType {
  #[default]
  Pdf,
  Png,
  Jpeg,
  Webp,
}

impl OutputType {
  pub fn mime(self) -> &'static str {
    match self {
      OutputType::Pdf => "application/pdf",
      OutputType::Png => "image/png",
      OutputType::Jpeg => "image/jpeg",
      OutputType::Webp => "image/webp",
    }
  }

  pub fn as_str(self) -> &'static str {
    match self {
      OutputType::Pdf => "pdf",
      OutputType::Png => "png",
      OutputType::Jpeg => "jpeg",
      OutputType::Webp => "webp",
    }
  }
}

/// What an engine renders: the whole document as PDF, or one page as PNG.
#[derive(Debug, Clone, Copy)]
enum Output {
  Pdf,
  Image { page: u32 },
}

/// One conversion, in the terms of unoserver's API plus the WordCraft extras.
#[derive(Debug, Default, Clone)]
pub struct ConvertRequest {
  /// Input format by extension.
  pub format: Option<String>,
  /// LibreOffice import filter name; names the input format.
  pub input_filter: Option<String>,
  /// Output type; defaults to the output filter's, else PDF.
  pub convert_to: Option<OutputType>,
  /// LibreOffice export filter name.
  pub output_filter: Option<String>,
  /// unoconvert filter options (`PageRange=1-2`, JSON objects).
  pub filter_options: Vec<String>,
  /// Update indexes and fields before exporting (text documents).
  pub update_index: bool,
  pub password: Option<String>,
  /// Print Markup (text documents).
  pub markup: bool,
  /// Refuse output with missing glyphs or pictures (text documents).
  pub strict: bool,
}

impl ConvertRequest {
  /// The engine and the arguments describing this request, for the process list.
  pub fn describe(&self) -> Vec<String> {
    let mut args = vec![
      "--convert-to".to_string(),
      self.convert_to.unwrap_or_default().as_str().into(),
    ];
    let mut push = |flag: &str, value: &Option<String>| {
      if let Some(v) = value {
        args.push(flag.into());
        args.push(v.clone());
      }
    };
    push("--format", &self.format);
    push("--input-filter", &self.input_filter);
    push("--output-filter", &self.output_filter);
    for option in &self.filter_options {
      args.push("--filter-option".into());
      args.push(option.clone());
    }
    for (flag, on) in [
      ("--update-index", self.update_index),
      ("--markup", self.markup),
      ("--strict", self.strict),
    ] {
      if on {
        args.push(flag.into());
      }
    }
    args
  }
}

#[derive(Debug, thiserror::Error)]
pub enum ConvertError {
  #[error("unsupported input format `{0}`")]
  UnsupportedFormat(String),
  #[error("unsupported filter `{0}`")]
  UnsupportedFilter(String),
  #[error("{0}")]
  UnsupportedOutput(String),
  #[error("{0}")]
  InvalidOption(String),
  #[error("document is password protected")]
  PasswordRequired,
  #[error("wrong document password")]
  WrongPassword,
  #[error("{0}")]
  PasswordUnsupported(String),
  #[error("cannot read document: {0}")]
  Read(String),
  #[error("{0}")]
  Strict(String),
  #[error("cannot write output: {0}")]
  Write(String),
}

#[derive(Debug)]
pub struct Converted {
  pub bytes: Vec<u8>,
  pub output: OutputType,
  pub engine: Engine,
}

/// The engine `request` goes to for `bytes`, and the format it reads them as (`None`: let
/// WordCraft detect text formats).
pub fn route(bytes: &[u8], request: &ConvertRequest) -> Result<(Engine, Option<String>), ConvertError> {
  let format = match (&request.input_filter, &request.format) {
    (Some(filter), _) => Some(filters::input_filter_format(filter)?.to_string()),
    (None, Some(format)) => Some(detect::normalize(format)),
    (None, None) => detect::sniff(bytes).map(str::to_string),
  };
  match format {
    Some(ext) => match detect::engine_for(&ext) {
      Some(engine) => Ok((engine, Some(ext))),
      None => Err(ConvertError::UnsupportedFormat(ext)),
    },
    None => Ok((Engine::Word, None)),
  }
}

/// Convert a document. CPU bound: call it from a blocking thread.
pub fn convert(bytes: &[u8], request: &ConvertRequest) -> Result<Converted, ConvertError> {
  let output = match (&request.output_filter, request.convert_to) {
    (Some(filter), convert_to) => {
      let by_filter = filters::output_filter_type(filter)?;
      if convert_to.is_some_and(|c| c != by_filter) {
        return Err(ConvertError::InvalidOption(format!(
          "outputFilter `{filter}` writes {}, not {}",
          by_filter.as_str(),
          convert_to.unwrap_or_default().as_str()
        )));
      }
      by_filter
    }
    (None, convert_to) => convert_to.unwrap_or_default(),
  };
  let options = FilterOptions::parse(&request.filter_options)?;
  if !options.ignored.is_empty() {
    tracing::debug!(ignored = ?options.ignored, "filter options without effect");
  }
  let (engine, format) = route(bytes, request)?;
  let name = format
    .as_deref()
    .map_or_else(|| "input".to_string(), |ext| format!("input.{ext}"));

  let engine_output = match output {
    OutputType::Pdf => Output::Pdf,
    _ => Output::Image {
      page: options.page_range.as_deref().map(first_page).transpose()?.unwrap_or(1),
    },
  };
  let password = request.password.as_deref();
  let rendered = match engine {
    Engine::Word => word::convert(
      &name,
      bytes,
      engine_output,
      &word::WordOptions {
        password,
        update_index: request.update_index,
        markup: request.markup,
        strict: request.strict,
      },
    )?,
    Engine::Presentation => presentation::convert(&name, bytes, engine_output)?,
    Engine::Spreadsheet => spreadsheet::convert(&name, bytes, engine_output, password)?,
  };

  let bytes = match output {
    OutputType::Pdf => match &options.page_range {
      Some(range) => pdf::select_pages(&rendered, range)?,
      None => rendered,
    },
    OutputType::Png => rendered,
    OutputType::Jpeg | OutputType::Webp => reencode(&rendered, output, options.quality)?,
  };
  Ok(Converted { bytes, output, engine })
}

/// The first page a range names, for image output (one page).
fn first_page(range: &str) -> Result<u32, ConvertError> {
  filters::parse_page_range(range, u32::from(u16::MAX)).map(|pages| pages[0])
}

fn reencode(png: &[u8], output: OutputType, quality: Option<u8>) -> Result<Vec<u8>, ConvertError> {
  let image = image::load_from_memory_with_format(png, image::ImageFormat::Png)
    .map_err(|e| ConvertError::Write(e.to_string()))?;
  let mut out = std::io::Cursor::new(Vec::new());
  let result = match output {
    OutputType::Jpeg => {
      let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, quality.unwrap_or(90));
      image.to_rgb8().write_with_encoder(encoder)
    }
    _ => image.write_to(&mut out, image::ImageFormat::WebP),
  };
  result.map_err(|e| ConvertError::Write(e.to_string()))?;
  Ok(out.into_inner())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn converts_plain_text() {
    let request = ConvertRequest {
      format: Some(".TXT".into()),
      ..Default::default()
    };
    let converted = convert(b"Hello", &request).unwrap();
    assert!(converted.bytes.starts_with(b"%PDF-"));
    assert_eq!(converted.engine, Engine::Word);
  }

  #[test]
  fn rejects_unknown_format() {
    let request = ConvertRequest {
      format: Some("exe".into()),
      ..Default::default()
    };
    assert!(matches!(convert(b"x", &request), Err(ConvertError::UnsupportedFormat(f)) if f == "exe"));
  }

  #[test]
  fn output_filter_must_match_convert_to() {
    let request = ConvertRequest {
      format: Some("txt".into()),
      convert_to: Some(OutputType::Png),
      output_filter: Some("writer_pdf_Export".into()),
      ..Default::default()
    };
    assert!(matches!(convert(b"x", &request), Err(ConvertError::InvalidOption(_))));
  }

  #[test]
  fn output_filter_sets_the_output_type() {
    let request = ConvertRequest {
      format: Some("txt".into()),
      output_filter: Some("writer_jpg_Export".into()),
      ..Default::default()
    };
    let converted = convert(b"Hello", &request).unwrap();
    assert_eq!(converted.output, OutputType::Jpeg);
    assert!(converted.bytes.starts_with(&[0xFF, 0xD8]));
  }
}
