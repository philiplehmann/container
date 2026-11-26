//! LibreOffice / unoserver compatibility: filter names and filter options as unoconvert takes
//! them, mapped onto what the ArtCraft engines do.

use std::collections::BTreeMap;

use super::{ConvertError, OutputType};

/// The input format a LibreOffice import filter name stands for.
pub fn input_filter_format(filter: &str) -> Result<&'static str, ConvertError> {
  Ok(match filter.trim() {
    "MS Word 2007 XML" | "Office Open XML Text" | "MS Word 2007 XML VBA" => "docx",
    "MS Word 2007 XML Template" | "Office Open XML Text Template" => "dotx",
    "MS Word 97" | "MS Word 95" | "MS WinWord 6.0" => "doc",
    "MS Word 97 Vorlage" => "dot",
    "writer8" | "StarOffice XML (Writer)" => "odt",
    "writer8_template" => "ott",
    "Rich Text Format" => "rtf",
    "HTML (StarWriter)" | "HTML" | "XHTML Writer File" => "html",
    "Markdown" => "md",
    "Text" | "Text (encoded)" => "txt",
    "Impress MS PowerPoint 2007 XML" | "Impress Office Open XML" => "pptx",
    "Impress MS PowerPoint 2007 XML AutoPlay" => "ppsx",
    "Impress MS PowerPoint 2007 XML Template" => "potx",
    "MS PowerPoint 97" => "ppt",
    "MS PowerPoint 97 AutoPlay" => "pps",
    "Calc MS Excel 2007 XML" | "Calc Office Open XML" | "Calc MS Excel 2007 VBA XML" => "xlsx",
    "Calc MS Excel 2007 XML Template" => "xltx",
    "Calc MS Excel 2007 Binary" => "xlsb",
    "MS Excel 97" | "MS Excel 95" => "xls",
    "calc8" | "StarOffice XML (Calc)" => "ods",
    "Text - txt - csv (StarCalc)" => "csv",
    other => return Err(ConvertError::UnsupportedFilter(other.to_string())),
  })
}

/// The output type a LibreOffice export filter name writes.
pub fn output_filter_type(filter: &str) -> Result<OutputType, ConvertError> {
  let filter = filter.trim();
  let app = [
    "writer_",
    "impress_",
    "calc_",
    "draw_",
    "writer_web_",
    "writer_globaldocument_",
    "math_",
  ]
  .iter()
  .find_map(|prefix| filter.strip_prefix(prefix));
  match app {
    Some("pdf_Export") => Ok(OutputType::Pdf),
    Some("png_Export") => Ok(OutputType::Png),
    Some("jpg_Export") => Ok(OutputType::Jpeg),
    Some("webp_Export") => Ok(OutputType::Webp),
    _ => Err(ConvertError::UnsupportedFilter(filter.to_string())),
  }
}

/// Filter options as unoconvert takes them: each entry is `Name=Value`, or a JSON object of
/// `{"Name": {"type": "…", "value": …}}`. Names the engines don't use (`SelectPdfVersion`,
/// `Quality`'s siblings…) are accepted and ignored, as LibreOffice ignores unknown ones.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct FilterOptions {
  /// `PageRange`: pages (slides) to export, e.g. `1-2`, `1,3,5-7`, `4-`.
  pub page_range: Option<String>,
  /// `Quality` of a JPEG (1-100).
  pub quality: Option<u8>,
  /// Everything else, kept for logging.
  pub ignored: BTreeMap<String, String>,
}

impl FilterOptions {
  pub fn parse(entries: &[String]) -> Result<Self, ConvertError> {
    let mut options = FilterOptions::default();
    for entry in entries {
      let entry = entry.trim();
      if entry.starts_with('{') {
        let json: serde_json::Value =
          serde_json::from_str(entry).map_err(|e| ConvertError::InvalidOption(format!("filterOptions JSON: {e}")))?;
        let object = json
          .as_object()
          .ok_or_else(|| ConvertError::InvalidOption("filterOptions JSON must be an object".into()))?;
        for (name, value) in object {
          // `{"type": "string", "value": "1-2"}`, or a bare value.
          let value = value.get("value").unwrap_or(value);
          let value = match value {
            serde_json::Value::String(s) => s.clone(),
            other => other.to_string(),
          };
          options.set(name, value)?;
        }
      } else if let Some((name, value)) = entry.split_once('=') {
        options.set(name.trim(), value.trim().to_string())?;
      } else if !entry.is_empty() {
        return Err(ConvertError::InvalidOption(format!(
          "filter option `{entry}` is not `Name=Value` or a JSON object"
        )));
      }
    }
    Ok(options)
  }

  fn set(&mut self, name: &str, value: String) -> Result<(), ConvertError> {
    match name {
      "PageRange" => self.page_range = Some(value),
      "Quality" => {
        let quality = value
          .parse::<u8>()
          .ok()
          .filter(|q| (1..=100).contains(q))
          .ok_or_else(|| ConvertError::InvalidOption(format!("Quality `{value}` is not 1-100")))?;
        self.quality = Some(quality);
      }
      _ => {
        self.ignored.insert(name.to_string(), value);
      }
    }
    Ok(())
  }
}

/// 1-based page numbers of `range` (`1-2`, `1,3;5-7`, `4-`, `-2`) within `count` pages, in
/// document order. Pages past the end are left out, as LibreOffice does; a range that selects
/// nothing is an error.
pub fn parse_page_range(range: &str, count: u32) -> Result<Vec<u32>, ConvertError> {
  let invalid = || ConvertError::InvalidOption(format!("PageRange `{range}` is not a valid page range"));
  let mut selected = std::collections::BTreeSet::new();
  for part in range.split([',', ';']).map(str::trim).filter(|p| !p.is_empty()) {
    let (from, to) = match part.split_once('-') {
      Some((a, b)) => (a.trim(), b.trim()),
      None => (part, part),
    };
    let number = |s: &str, default: u32| -> Result<u32, ConvertError> {
      if s.is_empty() {
        Ok(default)
      } else {
        s.parse::<u32>().ok().filter(|n| *n > 0).ok_or_else(invalid)
      }
    };
    let (from, to) = (number(from, 1)?, number(to, count)?);
    if from > to {
      return Err(invalid());
    }
    selected.extend((from..=to.min(count)).filter(|p| *p >= 1));
  }
  if selected.is_empty() {
    return Err(ConvertError::InvalidOption(format!(
      "PageRange `{range}` selects none of the {count} pages"
    )));
  }
  Ok(selected.into_iter().collect())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_string_and_json_options() {
    let options = FilterOptions::parse(&[
      "PageRange=1-2".into(),
      r#"{"SelectPdfVersion":{"type":"long","value":3},"Quality":{"type":"long","value":80}}"#.into(),
    ])
    .unwrap();
    assert_eq!(options.page_range.as_deref(), Some("1-2"));
    assert_eq!(options.quality, Some(80));
    assert_eq!(options.ignored.get("SelectPdfVersion").map(String::as_str), Some("3"));
    assert!(FilterOptions::parse(&["nonsense".into()]).is_err());
  }

  #[test]
  fn parses_page_ranges() {
    assert_eq!(parse_page_range("1-2", 7).unwrap(), vec![1, 2]);
    assert_eq!(parse_page_range("5-;1", 7).unwrap(), vec![1, 5, 6, 7]);
    assert_eq!(parse_page_range("-2", 7).unwrap(), vec![1, 2]);
    assert_eq!(parse_page_range("3,3,2", 7).unwrap(), vec![2, 3]);
    assert_eq!(parse_page_range("6-9", 7).unwrap(), vec![6, 7]);
    assert!(parse_page_range("9-10", 7).is_err());
    assert!(parse_page_range("2-1", 7).is_err());
    assert!(parse_page_range("a", 7).is_err());
  }

  #[test]
  fn maps_filter_names() {
    assert_eq!(output_filter_type("writer_pdf_Export").unwrap(), OutputType::Pdf);
    assert_eq!(output_filter_type("impress_png_Export").unwrap(), OutputType::Png);
    assert!(output_filter_type("invalid_filter_name").is_err());
    assert_eq!(input_filter_format("MS Word 2007 XML").unwrap(), "docx");
    assert!(input_filter_format("nope").is_err());
  }
}
