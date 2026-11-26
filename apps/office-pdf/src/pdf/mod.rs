//! PDF tools: what the poppler (text, HTML, images) and pdftk (compress, encrypt, forms, split,
//! merge, rotate, stamp) images do, in process. Editing uses lopdf; reading content (text,
//! rendering) uses craft-libs' hayro.

pub mod forms;
pub mod info;
pub mod overlay;
pub mod pages;
pub mod render;
pub mod security;
pub mod text;
pub mod zip;

use lopdf::{Dictionary, Document, LoadOptions, Object, ObjectId};

#[derive(Debug, thiserror::Error)]
pub enum PdfError {
  #[error("not a readable PDF: {0}")]
  Invalid(String),
  #[error("the PDF is password protected")]
  PasswordRequired,
  #[error("wrong PDF password")]
  WrongPassword,
  #[error("{0}")]
  BadRequest(String),
  #[error("cannot write PDF: {0}")]
  Write(String),
}

/// Load a PDF. An encrypted file is decrypted with `password` (or the empty user password) and
/// loses its encryption: what is written back is plain unless encrypted again.
pub fn open(bytes: &[u8], password: Option<&str>) -> Result<Document, PdfError> {
  if !bytes.starts_with(b"%PDF")
    && !bytes
      .get(..1024)
      .is_some_and(|head| head.windows(5).any(|w| w == b"%PDF-"))
  {
    return Err(PdfError::Invalid("no %PDF header".into()));
  }
  let options = match password {
    Some(p) => LoadOptions::with_password(p),
    None => LoadOptions::default(),
  };
  let mut doc = Document::load_mem_with_options(bytes, options).map_err(|e| match e {
    lopdf::Error::InvalidPassword => {
      if password.is_some() {
        PdfError::WrongPassword
      } else {
        PdfError::PasswordRequired
      }
    }
    lopdf::Error::Decryption(_) => PdfError::WrongPassword,
    other => PdfError::Invalid(other.to_string()),
  })?;
  if doc.encryption_state.is_some() || doc.trailer.has(b"Encrypt") {
    if let Ok(id) = doc.trailer.get(b"Encrypt").and_then(Object::as_reference) {
      doc.objects.remove(&id);
    }
    doc.trailer.remove(b"Encrypt");
    doc.encryption_state = None;
  }
  if doc.get_pages().is_empty() {
    return Err(PdfError::Invalid("the PDF has no pages".into()));
  }
  Ok(doc)
}

/// Serialize; `compress` packs objects into compressed object streams and deflates streams.
pub fn save(doc: &mut Document, compress: bool) -> Result<Vec<u8>, PdfError> {
  let mut out = Vec::new();
  if compress {
    doc.compress();
    let options = lopdf::SaveOptions::builder()
      .use_object_streams(true)
      .use_xref_streams(true)
      .build();
    doc
      .save_with_options(&mut out, options)
      .map_err(|e| PdfError::Write(e.to_string()))?;
  } else {
    doc.save_to(&mut out).map_err(|e| PdfError::Write(e.to_string()))?;
  }
  Ok(out)
}

/// pdftk `compress`: deflate every stream and pack objects into object streams.
pub fn compress(bytes: &[u8], password: Option<&str>) -> Result<Vec<u8>, PdfError> {
  let mut doc = open(bytes, password)?;
  doc.prune_objects();
  save(&mut doc, true)
}

/// pdftk `uncompress`: decode every stream, no object streams, so the file is readable as text.
pub fn uncompress(bytes: &[u8], password: Option<&str>) -> Result<Vec<u8>, PdfError> {
  let mut doc = open(bytes, password)?;
  doc.decompress();
  save(&mut doc, false)
}

/// Follow a reference (once is enough for well-formed files; a few more for safety).
pub fn resolve<'a>(doc: &'a Document, mut object: &'a Object) -> &'a Object {
  for _ in 0..8 {
    match object {
      Object::Reference(id) => match doc.get_object(*id) {
        Ok(o) => object = o,
        Err(_) => return &Object::Null,
      },
      _ => return object,
    }
  }
  object
}

pub fn dict<'a>(doc: &'a Document, object: &'a Object) -> Option<&'a Dictionary> {
  resolve(doc, object).as_dict().ok()
}

/// A page attribute, inherited from the page tree when the page doesn't set it.
pub fn inherited<'a>(doc: &'a Document, page: ObjectId, key: &[u8]) -> Option<&'a Object> {
  let mut current = doc.get_object(page).ok()?.as_dict().ok()?;
  for _ in 0..64 {
    if let Ok(value) = current.get(key) {
      return Some(value);
    }
    let parent = current.get(b"Parent").ok()?;
    current = dict(doc, parent)?;
  }
  None
}

/// A rectangle as four numbers, normalized (lower left first).
pub fn rect(doc: &Document, object: &Object) -> Option<[f64; 4]> {
  let values: Vec<f64> = resolve(doc, object)
    .as_array()
    .ok()?
    .iter()
    .filter_map(|o| number(resolve(doc, o)))
    .collect();
  let [a, b, c, d] = values.as_slice() else { return None };
  Some([a.min(*c), b.min(*d), a.max(*c), b.max(*d)])
}

/// A PDF number as f64, keeping the precision it was written with (reals are f32 in lopdf).
pub fn number(object: &Object) -> Option<f64> {
  match object {
    Object::Integer(i) => Some(*i as f64),
    Object::Real(r) => format!("{r}").parse().ok(),
    _ => None,
  }
}

/// The page's MediaBox (inherited), or Letter.
pub fn media_box(doc: &Document, page: ObjectId) -> [f64; 4] {
  inherited(doc, page, b"MediaBox")
    .and_then(|o| rect(doc, o))
    .unwrap_or([0.0, 0.0, 612.0, 792.0])
}

/// The page's /Rotate, normalized to 0, 90, 180 or 270.
pub fn rotation(doc: &Document, page: ObjectId) -> i64 {
  let rotate = inherited(doc, page, b"Rotate")
    .and_then(|o| resolve(doc, o).as_i64().ok())
    .unwrap_or(0);
  rotate.rem_euclid(360) / 90 * 90
}

/// Text from a PDF string: UTF-16 with a byte order mark, else PDFDocEncoding (Latin-1 close
/// enough for the printable range).
pub fn text_string(object: &Object) -> Option<String> {
  let bytes = match object {
    Object::String(bytes, _) => bytes,
    Object::Name(name) => return Some(String::from_utf8_lossy(name).to_string()),
    _ => return None,
  };
  if bytes.starts_with(&[0xFE, 0xFF]) {
    let units: Vec<u16> = bytes[2..]
      .as_chunks::<2>()
      .0
      .iter()
      .map(|&pair| u16::from_be_bytes(pair))
      .collect();
    return Some(String::from_utf16_lossy(&units));
  }
  if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
    return Some(String::from_utf8_lossy(&bytes[3..]).to_string());
  }
  Some(bytes.iter().map(|&b| pdfdoc_char(b)).collect())
}

/// A PDF text string for `text`: PDFDocEncoding when it fits, else UTF-16BE with a BOM.
pub fn pdf_string(text: &str) -> Object {
  if text
    .chars()
    .all(|c| (c as u32) < 0x80 || ((c as u32) >= 0xA1 && (c as u32) <= 0xFF))
  {
    Object::String(text.chars().map(|c| c as u8).collect(), lopdf::StringFormat::Literal)
  } else {
    let mut bytes = vec![0xFE, 0xFF];
    for unit in text.encode_utf16() {
      bytes.extend_from_slice(&unit.to_be_bytes());
    }
    Object::String(bytes, lopdf::StringFormat::Hexadecimal)
  }
}

fn pdfdoc_char(b: u8) -> char {
  // The PDFDocEncoding differences from Latin-1 in 0x80–0x9F (ISO 32000-1, Annex D.2).
  const HIGH: [char; 32] = [
    '•', '†', '‡', '…', '—', '–', 'ƒ', '⁄', '‹', '›', '−', '‰', '„', '“', '”', '‘', '’', '‚', '™', 'ﬁ', 'ﬂ', 'Ł', 'Œ',
    'Š', 'Ÿ', 'Ž', 'ı', 'ł', 'œ', 'š', 'ž', '\u{FFFD}',
  ];
  match b {
    0x80..=0x9F => HIGH[(b - 0x80) as usize],
    0xA0 => '€',
    _ => b as char,
  }
}

/// Round to `places` decimals, as pdftk prints page boxes.
pub fn round(value: f64, places: i32) -> f64 {
  let factor = 10f64.powi(places);
  let rounded = (value * factor).round() / factor;
  if rounded == 0.0 { 0.0 } else { rounded }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn decodes_text_strings() {
    assert_eq!(text_string(&Object::string_literal("Name")).unwrap(), "Name");
    let utf16 = Object::String(
      vec![0xFE, 0xFF, 0x00, 0xE4, 0x20, 0xAC],
      lopdf::StringFormat::Hexadecimal,
    );
    assert_eq!(text_string(&utf16).unwrap(), "ä€");
    assert_eq!(text_string(&pdf_string("Grüße")).unwrap(), "Grüße");
    assert_eq!(text_string(&pdf_string("€ and ✓")).unwrap(), "€ and ✓");
  }

  #[test]
  fn rejects_non_pdf() {
    assert!(matches!(open(b"hello", None), Err(PdfError::Invalid(_))));
  }

  #[test]
  fn rounds_like_pdftk() {
    assert_eq!(round(604.2756, 3), 604.276);
    assert_eq!(round(850.8898, 3), 850.89);
    assert_eq!(round(-9.0, 3), -9.0);
  }
}
