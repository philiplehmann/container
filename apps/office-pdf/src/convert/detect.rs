//! Which engine reads a document, and as which format.

/// The ArtCraft engine for a document family.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Engine {
  /// WordCraft: text documents.
  Word,
  /// DeckCraft: presentations.
  Presentation,
  /// GridCraft: spreadsheets.
  Spreadsheet,
}

impl Engine {
  pub fn name(self) -> &'static str {
    match self {
      Engine::Word => "wordcraft",
      Engine::Presentation => "deckcraft",
      Engine::Spreadsheet => "gridcraft",
    }
  }
}

pub const WORD_FORMATS: &[&str] = &[
  "docx", "docm", "dotx", "dotm", "doc", "dot", "odt", "ott", "rtf", "html", "htm", "md", "txt", "xml",
];
pub const PRESENTATION_FORMATS: &[&str] = &["pptx", "pptm", "potx", "potm", "ppsx", "ppsm", "ppt", "pps", "pot"];
pub const SPREADSHEET_FORMATS: &[&str] = &[
  "xlsx", "xlsm", "xltx", "xltm", "xls", "xlt", "xlsb", "ods", "csv", "tsv",
];

/// The engine for a format given by extension.
pub fn engine_for(ext: &str) -> Option<Engine> {
  if WORD_FORMATS.contains(&ext) {
    Some(Engine::Word)
  } else if PRESENTATION_FORMATS.contains(&ext) {
    Some(Engine::Presentation)
  } else if SPREADSHEET_FORMATS.contains(&ext) {
    Some(Engine::Spreadsheet)
  } else {
    None
  }
}

pub fn normalize(format: &str) -> String {
  format.trim().trim_start_matches('.').to_ascii_lowercase()
}

/// The format of `bytes` by their content: OOXML and OpenDocument packages and OLE compound
/// files (legacy Office) are told apart by what they contain. `None` for anything else; the
/// word engine then detects RTF, HTML, Markdown and text itself.
pub fn sniff(bytes: &[u8]) -> Option<&'static str> {
  const ZIP: &[u8] = b"PK\x03\x04";
  const OLE: &[u8] = &[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
  if bytes.starts_with(ZIP) {
    // OpenDocument: the uncompressed `mimetype` entry comes first.
    if let Some(rest) = bytes.get(30..).filter(|b| b.starts_with(b"mimetype")) {
      let head = &rest[..rest.len().min(120)];
      for (mime, ext) in [
        (&b"application/vnd.oasis.opendocument.text"[..], "odt"),
        (b"application/vnd.oasis.opendocument.spreadsheet", "ods"),
        (b"application/vnd.oasis.opendocument.presentation", "odp"),
      ] {
        if contains(head, mime) {
          return Some(ext);
        }
      }
    }
    // OOXML: entry names are stored uncompressed in the local and central headers.
    if contains(bytes, b"word/") {
      return Some("docx");
    }
    if contains(bytes, b"ppt/") {
      return Some("pptx");
    }
    if contains(bytes, b"xl/") {
      return Some("xlsx");
    }
    return None;
  }
  if bytes.starts_with(OLE) {
    // Stream names in the directory are UTF-16LE.
    for (name, ext) in [
      ("WordDocument", "doc"),
      ("PowerPoint Document", "ppt"),
      ("Workbook", "xls"),
      ("Book", "xls"),
    ] {
      let utf16: Vec<u8> = name.encode_utf16().flat_map(u16::to_le_bytes).collect();
      if contains(bytes, &utf16) {
        return Some(ext);
      }
    }
  }
  None
}

fn contains(haystack: &[u8], needle: &[u8]) -> bool {
  haystack.windows(needle.len()).any(|w| w == needle)
}

/// The input format named by a request `Content-Type`.
pub fn format_from_mime(mime: &str) -> Option<&'static str> {
  let essence = mime.split(';').next().unwrap_or("").trim().to_ascii_lowercase();
  Some(match essence.as_str() {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => "docx",
    "application/vnd.ms-word.document.macroenabled.12" => "docm",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template" => "dotx",
    "application/msword" => "doc",
    "application/vnd.oasis.opendocument.text" => "odt",
    "application/rtf" | "text/rtf" => "rtf",
    "text/html" => "html",
    "text/markdown" => "md",
    "text/plain" => "txt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation" => "pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow" => "ppsx",
    "application/vnd.ms-powerpoint" => "ppt",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => "xlsx",
    "application/vnd.ms-excel" => "xls",
    "application/vnd.oasis.opendocument.spreadsheet" => "ods",
    "text/csv" => "csv",
    "text/tab-separated-values" => "tsv",
    _ => return None,
  })
}

#[cfg(test)]
mod tests {
  use super::*;

  fn asset(name: &str) -> Vec<u8> {
    std::fs::read(format!("{}/tests/assets/{name}", env!("CARGO_MANIFEST_DIR"))).unwrap()
  }

  #[test]
  fn sniffs_office_files() {
    assert_eq!(sniff(&asset("dummy.docx")), Some("docx"));
    assert_eq!(sniff(&asset("dummy.pptx")), Some("pptx"));
    assert_eq!(sniff(&asset("VorlageBusinessplan.doc")), Some("doc"));
    assert_eq!(sniff(b"{\\rtf1 hello}"), None);
  }

  #[test]
  fn routes_formats_to_engines() {
    assert_eq!(engine_for("docx"), Some(Engine::Word));
    assert_eq!(engine_for("ppt"), Some(Engine::Presentation));
    assert_eq!(engine_for("ods"), Some(Engine::Spreadsheet));
    assert_eq!(engine_for("exe"), None);
  }

  #[test]
  fn maps_mime_types() {
    assert_eq!(format_from_mime("text/plain; charset=utf-8"), Some("txt"));
    assert_eq!(
      format_from_mime("application/vnd.openxmlformats-officedocument.presentationml.presentation"),
      Some("pptx")
    );
    assert_eq!(format_from_mime("application/octet-stream"), None);
  }
}
