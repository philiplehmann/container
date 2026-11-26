//! PDF post-processing shared by all engines.

use super::ConvertError;
use super::filters::parse_page_range;

/// Keep only the pages `range` selects (LibreOffice's `PageRange` filter option).
pub fn select_pages(pdf: &[u8], range: &str) -> Result<Vec<u8>, ConvertError> {
  let mut doc = lopdf::Document::load_mem(pdf).map_err(|e| ConvertError::Write(format!("re-read pdf: {e}")))?;
  let count = u32::try_from(doc.get_pages().len()).unwrap_or(u32::MAX);
  let keep = parse_page_range(range, count)?;
  if keep.len() as u32 == count {
    return Ok(pdf.to_vec());
  }
  let drop: Vec<u32> = (1..=count).filter(|p| !keep.contains(p)).collect();
  doc.delete_pages(&drop);
  doc.prune_objects();
  doc.compress();
  let mut out = Vec::with_capacity(pdf.len());
  doc
    .save_to(&mut out)
    .map_err(|e| ConvertError::Write(format!("write pdf: {e}")))?;
  Ok(out)
}
