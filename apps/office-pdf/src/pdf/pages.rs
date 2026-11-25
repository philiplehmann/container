//! Page level edits: select/reorder (pdftk `cat`), split (`burst`), merge, rotate; and the page
//! helpers the other edits share (resources, content wrapping).

use lopdf::{Dictionary, Document, Object, ObjectId, Stream};

use super::{PdfError, inherited, open, save};

/// Page attributes a page may inherit from the page tree.
const INHERITABLE: [&[u8]; 4] = [b"Resources", b"MediaBox", b"CropBox", b"Rotate"];

/// A page sequence in pdftk's `cat` syntax: numbers and ranges (`1-3`, `5-2` backwards), `end`,
/// `r1` for the last page (`r2` the one before), and `even` / `odd` after a range, separated by
/// commas or spaces. Pages may repeat.
pub fn parse_sequence(spec: &str, count: u32) -> Result<Vec<u32>, PdfError> {
  let invalid = |part: &str| {
    PdfError::BadRequest(format!(
      "`{part}` is not a page or page range (document has {count} pages)"
    ))
  };
  let page = |token: &str, part: &str| -> Result<u32, PdfError> {
    let n = match token {
      "end" => count,
      t if t.starts_with('r') => {
        let back: u32 = t[1..].parse().map_err(|_| invalid(part))?;
        if back == 0 || back > count {
          return Err(invalid(part));
        }
        count + 1 - back
      }
      t => t.parse().map_err(|_| invalid(part))?,
    };
    if n == 0 || n > count {
      return Err(invalid(part));
    }
    Ok(n)
  };
  let mut out = Vec::new();
  for part in spec.split([',', ' ']).map(str::trim).filter(|p| !p.is_empty()) {
    let lower = part.to_ascii_lowercase();
    let (range, parity) = match lower.strip_suffix("even") {
      Some(r) => (r.to_string(), Some(0)),
      None => match lower.strip_suffix("odd") {
        Some(r) => (r.to_string(), Some(1)),
        None => (lower.clone(), None),
      },
    };
    let range = if range.is_empty() { "1-end".to_string() } else { range };
    let (from, to) = match range.split_once('-') {
      Some((a, b)) => (page(a, part)?, page(b, part)?),
      None => {
        let p = page(&range, part)?;
        (p, p)
      }
    };
    let pages: Box<dyn Iterator<Item = u32>> = if from <= to {
      Box::new(from..=to)
    } else {
      Box::new((to..=from).rev())
    };
    out.extend(pages.filter(|p| parity.is_none_or(|parity| p % 2 == parity)));
  }
  if out.is_empty() {
    return Err(PdfError::BadRequest(format!("`{spec}` selects no pages")));
  }
  Ok(out)
}

/// Make `order` (page object ids, may repeat) the document's pages, in that order.
fn rebuild(doc: &mut Document, order: &[ObjectId]) -> Result<(), PdfError> {
  let root = doc
    .catalog()
    .and_then(|c| c.get(b"Pages"))
    .and_then(Object::as_reference)
    .map_err(|e| PdfError::Invalid(format!("page tree: {e}")))?;
  let all = doc.get_pages().len();
  let mut kids = Vec::with_capacity(order.len());
  let mut used = std::collections::HashSet::new();
  for &page in order {
    let mut dictionary = page_dict(doc, page)?.clone();
    for key in INHERITABLE {
      if !dictionary.has(key)
        && let Some(value) = inherited(doc, page, key)
      {
        dictionary.set(key, value.clone());
      }
    }
    dictionary.set("Parent", Object::Reference(root));
    let id = if used.insert(page) {
      doc.objects.insert(page, Object::Dictionary(dictionary));
      page
    } else {
      // The same page twice: a copy sharing its content and resources.
      doc.add_object(Object::Dictionary(dictionary))
    };
    kids.push(Object::Reference(id));
  }
  let mut pages = Dictionary::new();
  pages.set("Type", Object::Name(b"Pages".to_vec()));
  pages.set("Count", Object::Integer(kids.len() as i64));
  pages.set("Kids", Object::Array(kids));
  doc.objects.insert(root, Object::Dictionary(pages));
  if used.len() < all {
    // Bookmarks and named destinations may point at pages that are gone.
    if let Ok(catalog) = doc.catalog_mut() {
      catalog.remove(b"Outlines");
      catalog.remove(b"Dests");
    }
  }
  doc.prune_objects();
  Ok(())
}

fn page_dict(doc: &Document, page: ObjectId) -> Result<&Dictionary, PdfError> {
  doc
    .get_object(page)
    .and_then(Object::as_dict)
    .map_err(|e| PdfError::Invalid(format!("page {page:?}: {e}")))
}

fn page_ids(doc: &Document) -> Vec<ObjectId> {
  doc.get_pages().into_values().collect()
}

/// pdftk `cat`: the pages of `sequence`, in its order.
pub fn select(bytes: &[u8], password: Option<&str>, sequence: &str) -> Result<Vec<u8>, PdfError> {
  let mut doc = open(bytes, password)?;
  let ids = page_ids(&doc);
  let order: Vec<ObjectId> = parse_sequence(sequence, ids.len() as u32)?
    .into_iter()
    .map(|p| ids[p as usize - 1])
    .collect();
  rebuild(&mut doc, &order)?;
  save(&mut doc, true)
}

/// pdftk `burst`, or one file per range: `(file name, PDF)` pairs.
pub fn split(
  bytes: &[u8],
  password: Option<&str>,
  ranges: &[String],
  every: Option<u32>,
) -> Result<Vec<(String, Vec<u8>)>, PdfError> {
  let doc = open(bytes, password)?;
  let ids = page_ids(&doc);
  let count = ids.len() as u32;
  let parts: Vec<Vec<u32>> = if ranges.is_empty() {
    let every = every.unwrap_or(1).max(1);
    (1..=count)
      .collect::<Vec<_>>()
      .chunks(every as usize)
      .map(<[u32]>::to_vec)
      .collect()
  } else {
    ranges
      .iter()
      .map(|r| parse_sequence(r, count))
      .collect::<Result<_, _>>()?
  };
  parts
    .iter()
    .enumerate()
    .map(|(i, pages)| {
      let mut part = doc.clone();
      let order: Vec<ObjectId> = pages.iter().map(|p| ids[*p as usize - 1]).collect();
      rebuild(&mut part, &order)?;
      let name = if ranges.is_empty() && pages.len() == 1 {
        format!("pg_{:04}.pdf", pages[0])
      } else {
        format!("part_{:04}.pdf", i + 1)
      };
      Ok((name, save(&mut part, true)?))
    })
    .collect()
}

/// pdftk `cat` of several files: their pages one after the other. Form fields are combined.
pub fn merge(files: &[(Vec<u8>, Option<String>)]) -> Result<Vec<u8>, PdfError> {
  if files.is_empty() {
    return Err(PdfError::BadRequest("no PDF files to merge".into()));
  }
  let mut out = Document::with_version("1.7");
  let mut kids = Vec::new();
  let mut fields = Vec::new();
  let mut acroform: Option<Dictionary> = None;
  let mut next_id = 1;
  for (bytes, password) in files {
    let mut doc = open(bytes, password.as_deref())?;
    doc.renumber_objects_with(next_id);
    next_id = doc.max_id + 1;
    for page in page_ids(&doc) {
      let mut dictionary = page_dict(&doc, page)?.clone();
      for key in INHERITABLE {
        if !dictionary.has(key)
          && let Some(value) = inherited(&doc, page, key)
        {
          dictionary.set(key, value.clone());
        }
      }
      doc.objects.insert(page, Object::Dictionary(dictionary));
      kids.push(page);
    }
    if let Some(form) = doc
      .catalog()
      .ok()
      .and_then(|c| c.get(b"AcroForm").ok())
      .and_then(|o| super::dict(&doc, o))
      .cloned()
    {
      if let Ok(list) = form
        .get(b"Fields")
        .map(|o| super::resolve(&doc, o))
        .and_then(Object::as_array)
      {
        fields.extend(list.iter().cloned());
      }
      acroform.get_or_insert(form);
    }
    out.objects.extend(doc.objects);
  }
  out.max_id = next_id;
  let root = out.new_object_id();
  for &page in &kids {
    if let Ok(Object::Dictionary(d)) = out.get_object_mut(page) {
      d.set("Parent", Object::Reference(root));
    }
  }
  let mut pages = Dictionary::new();
  pages.set("Type", Object::Name(b"Pages".to_vec()));
  pages.set("Count", Object::Integer(kids.len() as i64));
  pages.set("Kids", Object::Array(kids.into_iter().map(Object::Reference).collect()));
  out.objects.insert(root, Object::Dictionary(pages));
  let mut catalog = Dictionary::new();
  catalog.set("Type", Object::Name(b"Catalog".to_vec()));
  catalog.set("Pages", Object::Reference(root));
  if let Some(mut form) = acroform {
    form.set("Fields", Object::Array(fields));
    catalog.set("AcroForm", Object::Dictionary(form));
  }
  let catalog = out.add_object(Object::Dictionary(catalog));
  out.trailer.set("Root", Object::Reference(catalog));
  out.prune_objects();
  save(&mut out, true)
}

/// Rotate pages by `angle` (a multiple of 90, clockwise) on top of their current rotation.
pub fn rotate(bytes: &[u8], password: Option<&str>, angle: i64, sequence: Option<&str>) -> Result<Vec<u8>, PdfError> {
  if angle % 90 != 0 {
    return Err(PdfError::BadRequest(format!("angle {angle} is not a multiple of 90")));
  }
  let mut doc = open(bytes, password)?;
  let ids = page_ids(&doc);
  let pages = match sequence {
    Some(s) => parse_sequence(s, ids.len() as u32)?,
    None => (1..=ids.len() as u32).collect(),
  };
  let mut done = std::collections::HashSet::new();
  for p in pages {
    let id = ids[p as usize - 1];
    if !done.insert(id) {
      continue;
    }
    let current = super::rotation(&doc, id);
    let value = (current + angle).rem_euclid(360);
    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(id) {
      d.set("Rotate", Object::Integer(value));
    }
  }
  save(&mut doc, true)
}

/// Where a page's resource dictionary lives.
#[derive(Clone, Copy)]
enum ResourcesAt {
  /// Directly in the page dictionary.
  Page(ObjectId),
  /// In an indirect object (possibly shared with other pages).
  Object(ObjectId),
}

fn resources_mut(doc: &mut Document, at: ResourcesAt) -> Result<&mut Dictionary, PdfError> {
  let result = match at {
    ResourcesAt::Object(id) => doc.get_object_mut(id).and_then(Object::as_dict_mut),
    ResourcesAt::Page(page) => doc
      .get_object_mut(page)
      .and_then(Object::as_dict_mut)
      .and_then(|d| d.get_mut(b"Resources"))
      .and_then(Object::as_dict_mut),
  };
  result.map_err(|e| PdfError::Invalid(format!("page resources: {e}")))
}

/// Add `xobject` to the page's resources under a free name starting with `prefix`; returns the
/// name. Inherited resources are copied onto the page first.
pub fn add_xobject(doc: &mut Document, page: ObjectId, prefix: &str, xobject: ObjectId) -> Result<Vec<u8>, PdfError> {
  let at = match page_dict(doc, page)?.get(b"Resources") {
    Ok(Object::Reference(id)) => ResourcesAt::Object(*id),
    Ok(_) => ResourcesAt::Page(page),
    Err(_) => {
      let value = inherited(doc, page, b"Resources")
        .cloned()
        .unwrap_or(Object::Dictionary(Dictionary::new()));
      let at = match &value {
        Object::Reference(id) => ResourcesAt::Object(*id),
        _ => ResourcesAt::Page(page),
      };
      if let Ok(Object::Dictionary(d)) = doc.get_object_mut(page) {
        d.set("Resources", value);
      }
      at
    }
  };
  let xobjects_at = match resources_mut(doc, at)?.get(b"XObject") {
    Ok(Object::Reference(id)) => Some(*id),
    _ => None,
  };
  let xobjects: &mut Dictionary = match xobjects_at {
    Some(id) => doc
      .get_object_mut(id)
      .and_then(Object::as_dict_mut)
      .map_err(|e| PdfError::Invalid(format!("page XObjects: {e}")))?,
    None => {
      let resources = resources_mut(doc, at)?;
      if !matches!(resources.get(b"XObject"), Ok(Object::Dictionary(_))) {
        resources.set("XObject", Object::Dictionary(Dictionary::new()));
      }
      resources
        .get_mut(b"XObject")
        .and_then(Object::as_dict_mut)
        .map_err(|e| PdfError::Invalid(format!("page XObjects: {e}")))?
    }
  };
  let name = (0..)
    .map(|i| format!("{prefix}{i}").into_bytes())
    .find(|n| !xobjects.has(n))
    .unwrap_or_default();
  xobjects.set(name.clone(), Object::Reference(xobject));
  Ok(name)
}

/// Put `before` under the page's content and `after` over it (the page's own content is wrapped
/// in `q … Q`, so a changed graphics state doesn't leak into `after`).
pub fn wrap_content(
  doc: &mut Document,
  page: ObjectId,
  before: Option<Vec<u8>>,
  after: Option<Vec<u8>>,
) -> Result<(), PdfError> {
  let mut contents: Vec<Object> = match page_dict(doc, page)?.get(b"Contents") {
    Ok(Object::Reference(id)) => match doc.get_object(*id) {
      Ok(Object::Array(a)) => a.clone(),
      _ => vec![Object::Reference(*id)],
    },
    Ok(Object::Array(a)) => a.clone(),
    Ok(Object::Stream(s)) => {
      let s = s.clone();
      vec![Object::Reference(doc.add_object(s))]
    }
    _ => Vec::new(),
  };
  let stream =
    |doc: &mut Document, content: Vec<u8>| Object::Reference(doc.add_object(Stream::new(Dictionary::new(), content)));
  if let Some(after) = after {
    contents.insert(0, stream(doc, b"q\n".to_vec()));
    contents.push(stream(doc, b"\nQ\n".to_vec()));
    contents.push(stream(doc, after));
  }
  if let Some(before) = before {
    contents.insert(0, stream(doc, before));
  }
  if let Ok(Object::Dictionary(d)) = doc.get_object_mut(page) {
    d.set("Contents", Object::Array(contents));
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_pdftk_sequences() {
    assert_eq!(parse_sequence("1-3", 5).unwrap(), vec![1, 2, 3]);
    assert_eq!(parse_sequence("3-1", 5).unwrap(), vec![3, 2, 1]);
    assert_eq!(parse_sequence("end,1", 5).unwrap(), vec![5, 1]);
    assert_eq!(parse_sequence("r1 r2", 5).unwrap(), vec![5, 4]);
    assert_eq!(parse_sequence("1-endodd", 5).unwrap(), vec![1, 3, 5]);
    assert_eq!(parse_sequence("even", 5).unwrap(), vec![2, 4]);
    assert_eq!(parse_sequence("2,2", 5).unwrap(), vec![2, 2]);
    assert!(parse_sequence("6", 5).is_err());
    assert!(parse_sequence("0", 5).is_err());
    assert!(parse_sequence("x", 5).is_err());
  }
}
