//! pdftk `stamp` / `multistamp` and `background` / `multibackground`: another PDF's page drawn
//! over or under every page.

use lopdf::{Dictionary, Object, ObjectId, Stream};

use super::pages::{add_xobject, wrap_content};
use super::{PdfError, inherited, media_box, open, rect, save};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Placement {
  /// Over the page content (stamp, watermark on top).
  Stamp,
  /// Under the page content (letterhead, background).
  Background,
}

/// Draw the first page of `overlay` on every page of `bytes`, or with `multi` overlay page n on
/// page n (pages past the overlay's last page stay as they are). The overlay page is scaled to
/// fit the page, keeping its proportions, and centred.
pub fn overlay(
  bytes: &[u8],
  password: Option<&str>,
  overlay: &[u8],
  placement: Placement,
  multi: bool,
) -> Result<Vec<u8>, PdfError> {
  let mut doc = open(bytes, password)?;
  let mut other = open(overlay, None).map_err(|e| PdfError::BadRequest(format!("overlay: {e}")))?;
  other.renumber_objects_with(doc.max_id + 1);
  let overlay_pages: Vec<ObjectId> = other.get_pages().into_values().collect();
  let forms: Vec<(ObjectId, [f64; 4])> = overlay_pages
    .iter()
    .take(if multi { usize::MAX } else { 1 })
    .map(|&page| {
      let bbox = inherited(&other, page, b"CropBox")
        .and_then(|o| rect(&other, o))
        .unwrap_or_else(|| media_box(&other, page));
      let content = other.get_page_content(page);
      let resources = inherited(&other, page, b"Resources")
        .cloned()
        .unwrap_or(Object::Dictionary(Dictionary::new()));
      let mut d = Dictionary::new();
      d.set("Type", Object::Name(b"XObject".to_vec()));
      d.set("Subtype", Object::Name(b"Form".to_vec()));
      d.set(
        "BBox",
        Object::Array(bbox.iter().map(|v| Object::Real(*v as f32)).collect()),
      );
      d.set("Resources", resources);
      let mut stream = Stream::new(d, content);
      let _ = stream.compress();
      (other.add_object(stream), bbox)
    })
    .collect();
  // The overlay's objects come along; whatever its pages don't use is pruned below.
  doc.max_id = other.max_id;
  doc.objects.extend(other.objects);

  let pages: Vec<ObjectId> = doc.get_pages().into_values().collect();
  for (i, page) in pages.into_iter().enumerate() {
    let Some(&(form, bbox)) = (if multi { forms.get(i) } else { forms.first() }) else {
      continue;
    };
    let target = inherited(&doc, page, b"CropBox")
      .and_then(|o| rect(&doc, o))
      .unwrap_or_else(|| media_box(&doc, page));
    let (bw, bh) = (bbox[2] - bbox[0], bbox[3] - bbox[1]);
    let (tw, th) = (target[2] - target[0], target[3] - target[1]);
    if bw <= 0.0 || bh <= 0.0 {
      continue;
    }
    let scale = (tw / bw).min(th / bh);
    let x = target[0] + (tw - bw * scale) / 2.0 - bbox[0] * scale;
    let y = target[1] + (th - bh * scale) / 2.0 - bbox[1] * scale;
    let name = add_xobject(&mut doc, page, "OPdfOverlay", form)?;
    let draw = format!(
      "q {scale:.6} 0 0 {scale:.6} {x:.4} {y:.4} cm /{} Do Q\n",
      String::from_utf8_lossy(&name)
    )
    .into_bytes();
    match placement {
      Placement::Stamp => wrap_content(&mut doc, page, None, Some(draw))?,
      Placement::Background => wrap_content(&mut doc, page, Some(draw), None)?,
    }
  }
  doc.prune_objects();
  save(&mut doc, true)
}
