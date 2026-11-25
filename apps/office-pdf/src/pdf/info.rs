//! Document information: pdftk `dump_data` (as the pdftk image's JSON) and `dump_data_annots`.

use lopdf::{Document, Object};
use serde::Serialize;
use utoipa::ToSchema;

use super::{PdfError, dict, media_box, number, open, rect, resolve, rotation, round, text_string};

/// The document information dictionary (only the entries the file sets).
#[derive(Debug, Default, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DumpInfo {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub title: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub author: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub subject: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub keywords: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub creator: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub producer: Option<String>,
  /// ISO 8601.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub creation_date: Option<String>,
  /// ISO 8601.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub mod_date: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DumpMeta {
  /// First file identifier, hex.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub id0: Option<String>,
  /// Second file identifier, hex.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub id1: Option<String>,
  pub number_of_pages: usize,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DumpPage {
  /// 1-based.
  pub number: usize,
  /// Degrees: 0, 90, 180 or 270.
  pub rotation: i64,
  /// MediaBox: lower left x, y, upper right x, y (points).
  #[serde(serialize_with = "numbers_as_written")]
  pub rect: [f64; 4],
  /// Width and height (points).
  #[serde(serialize_with = "numbers_as_written")]
  pub dimensions: [f64; 2],
}

/// Whole numbers as integers (`-9`, not `-9.0`), as pdftk writes them.
fn numbers_as_written<S: serde::Serializer, const N: usize>(
  values: &[f64; N],
  serializer: S,
) -> Result<S::Ok, S::Error> {
  use serde::ser::SerializeSeq;
  let mut seq = serializer.serialize_seq(Some(N))?;
  for v in values {
    if v.fract() == 0.0 && v.abs() < 1e15 {
      seq.serialize_element(&(*v as i64))?;
    } else {
      seq.serialize_element(v)?;
    }
  }
  seq.end()
}

fn optional_numbers_as_written<S: serde::Serializer>(
  values: &Option<[f64; 4]>,
  serializer: S,
) -> Result<S::Ok, S::Error> {
  match values {
    Some(v) => numbers_as_written(v, serializer),
    None => serializer.serialize_none(),
  }
}

/// pdftk `dump_data`, shaped like the pdftk image's `/data/dump`.
#[derive(Debug, Serialize, ToSchema)]
pub struct Dump {
  pub info: DumpInfo,
  pub meta: DumpMeta,
  pub pages: Vec<DumpPage>,
}

pub fn dump(bytes: &[u8], password: Option<&str>) -> Result<Dump, PdfError> {
  let doc = open(bytes, password)?;
  let mut info = DumpInfo::default();
  if let Some(dictionary) = doc.trailer.get(b"Info").ok().and_then(|o| dict(&doc, o)) {
    let get = |key: &[u8]| {
      dictionary
        .get(key)
        .ok()
        .and_then(|o| text_string(resolve(&doc, o)))
        .filter(|s| !s.trim().is_empty())
    };
    info = DumpInfo {
      title: get(b"Title"),
      author: get(b"Author"),
      subject: get(b"Subject"),
      keywords: get(b"Keywords"),
      creator: get(b"Creator"),
      producer: get(b"Producer"),
      creation_date: get(b"CreationDate").and_then(|d| pdf_date(&d)),
      mod_date: get(b"ModDate").and_then(|d| pdf_date(&d)),
    };
  }
  let ids: Vec<String> = doc
    .trailer
    .get(b"ID")
    .ok()
    .and_then(|o| resolve(&doc, o).as_array().ok())
    .map(|a| {
      a.iter()
        .filter_map(|o| match resolve(&doc, o) {
          Object::String(bytes, _) => Some(bytes.iter().map(|b| format!("{b:02x}")).collect()),
          _ => None,
        })
        .collect()
    })
    .unwrap_or_default();
  let pages: Vec<DumpPage> = doc
    .get_pages()
    .into_iter()
    .map(|(number, id)| {
      let [x0, y0, x1, y1] = media_box(&doc, id);
      DumpPage {
        number: number as usize,
        rotation: rotation(&doc, id),
        rect: [round(x0, 3), round(y0, 3), round(x1, 3), round(y1, 3)],
        dimensions: [round(x1 - x0, 3), round(y1 - y0, 3)],
      }
    })
    .collect();
  Ok(Dump {
    info,
    meta: DumpMeta {
      id0: ids.first().cloned(),
      id1: ids.get(1).cloned(),
      number_of_pages: pages.len(),
    },
    pages,
  })
}

/// A PDF date (`D:20240131120000+01'00'`) as ISO 8601.
pub fn pdf_date(date: &str) -> Option<String> {
  let s = date.trim().trim_start_matches("D:");
  let digits: String = s.chars().take_while(char::is_ascii_digit).collect();
  if digits.len() < 4 {
    return None;
  }
  let part = |from: usize, len: usize, default: &str| digits.get(from..from + len).unwrap_or(default).to_string();
  let (year, month, day) = (part(0, 4, "0000"), part(4, 2, "01"), part(6, 2, "01"));
  let (hour, minute, second) = (part(8, 2, "00"), part(10, 2, "00"), part(12, 2, "00"));
  let rest = &s[digits.len()..];
  let zone = match rest.chars().next() {
    Some('Z') | None => "Z".to_string(),
    Some(sign @ ('+' | '-')) => {
      let numbers: String = rest[1..].chars().filter(char::is_ascii_digit).collect();
      let hh = numbers.get(0..2).unwrap_or("00");
      let mm = numbers.get(2..4).unwrap_or("00");
      format!("{sign}{hh}:{mm}")
    }
    _ => "Z".to_string(),
  };
  Some(format!("{year}-{month}-{day}T{hour}:{minute}:{second}{zone}"))
}

/// One annotation (pdftk `dump_data_annots`).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
  /// 1-based page number.
  pub page: usize,
  /// `Link`, `Widget`, `Text`, `Highlight`, …
  pub subtype: String,
  #[serde(serialize_with = "optional_numbers_as_written")]
  pub rect: Option<[f64; 4]>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub contents: Option<String>,
  /// The URI of a link.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub uri: Option<String>,
  /// The field name of a form widget.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub field_name: Option<String>,
}

pub fn annotations(bytes: &[u8], password: Option<&str>) -> Result<Vec<Annotation>, PdfError> {
  let doc = open(bytes, password)?;
  let mut out = Vec::new();
  for (number, page) in doc.get_pages() {
    let Some(annots) = page_annotations(&doc, page) else {
      continue;
    };
    for annot in annots {
      let Some(a) = dict(&doc, annot) else { continue };
      let get = |key: &[u8]| a.get(key).ok().and_then(|o| text_string(resolve(&doc, o)));
      let uri = a
        .get(b"A")
        .ok()
        .and_then(|o| dict(&doc, o))
        .and_then(|action| action.get(b"URI").ok())
        .and_then(|o| text_string(resolve(&doc, o)));
      out.push(Annotation {
        page: number as usize,
        subtype: get(b"Subtype").unwrap_or_default(),
        rect: a
          .get(b"Rect")
          .ok()
          .and_then(|o| rect(&doc, o))
          .map(|r| r.map(|v| round(v, 3))),
        contents: get(b"Contents").filter(|s| !s.is_empty()),
        uri,
        field_name: get(b"T"),
      });
    }
  }
  Ok(out)
}

fn page_annotations(doc: &Document, page: lopdf::ObjectId) -> Option<&Vec<Object>> {
  let page = doc.get_object(page).ok()?.as_dict().ok()?;
  resolve(doc, page.get(b"Annots").ok()?).as_array().ok()
}

/// The numbers of an array, for callers that read raw arrays.
pub fn numbers(doc: &Document, object: &Object) -> Vec<f64> {
  resolve(doc, object)
    .as_array()
    .map(|a| a.iter().filter_map(|o| number(resolve(doc, o))).collect())
    .unwrap_or_default()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn converts_pdf_dates() {
    assert_eq!(
      pdf_date("D:20240131120500+01'00'").unwrap(),
      "2024-01-31T12:05:00+01:00"
    );
    assert_eq!(pdf_date("D:2024").unwrap(), "2024-01-01T00:00:00Z");
    assert_eq!(pdf_date("D:20240131120500Z").unwrap(), "2024-01-31T12:05:00Z");
    assert!(pdf_date("").is_none());
  }
}
