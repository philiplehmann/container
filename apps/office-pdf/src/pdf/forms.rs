//! AcroForm fields: pdftk `dump_data_fields` (as the pdftk image's JSON), `generate_fdf`,
//! `fill_form` (with appearances) and `flatten`.

use std::collections::{BTreeMap, BTreeSet};

use lopdf::{Dictionary, Document, Object, ObjectId, Stream};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::pages::{add_xobject, wrap_content};
use super::{PdfError, dict, number, open, pdf_string, rect, resolve, save, text_string};

/// Ff bits (ISO 32000-1, 12.7.4).
const MULTILINE: i64 = 1 << 12;
const PUSHBUTTON: i64 = 1 << 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum FieldType {
  Text,
  Button,
  Choice,
  Signature,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum Justification {
  Left,
  Center,
  Right,
}

/// A form field, shaped like the pdftk image's `/data/fields`.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Field {
  #[serde(rename = "type")]
  pub kind: FieldType,
  /// Fully qualified name (`parent.child`).
  pub name: String,
  /// The tooltip (`/TU`).
  #[serde(skip_serializing_if = "Option::is_none")]
  pub title: Option<String>,
  /// `/Ff` bits.
  pub flags: i64,
  pub justification: Justification,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub value: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub default_value: Option<String>,
  /// Choices of a list or combo box; states of a check box or radio group.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub options: Option<Vec<String>>,
}

/// A terminal field and its widget annotations.
struct Node {
  id: ObjectId,
  name: String,
  /// Inheritable entries resolved down the field tree.
  ft: Option<Vec<u8>>,
  ff: i64,
  q: i64,
  da: Option<String>,
  widgets: Vec<ObjectId>,
}

fn acroform(doc: &Document) -> Option<&Dictionary> {
  doc.catalog().ok()?.get(b"AcroForm").ok().and_then(|o| dict(doc, o))
}

fn collect(doc: &Document) -> Vec<Node> {
  let mut out = Vec::new();
  let Some(fields) = acroform(doc)
    .and_then(|f| f.get(b"Fields").ok())
    .map(|o| resolve(doc, o))
  else {
    return out;
  };
  let Ok(fields) = fields.as_array() else { return out };
  let parent = Node {
    id: (0, 0),
    name: String::new(),
    ft: None,
    ff: 0,
    q: 0,
    da: None,
    widgets: vec![],
  };
  for field in fields {
    if let Object::Reference(id) = field {
      visit(doc, *id, &parent, &mut out, 0);
    }
  }
  out
}

fn visit(doc: &Document, id: ObjectId, parent: &Node, out: &mut Vec<Node>, depth: usize) {
  if depth > 32 {
    return;
  }
  let Ok(d) = doc.get_object(id).and_then(Object::as_dict) else {
    return;
  };
  let part = d.get(b"T").ok().and_then(|o| text_string(resolve(doc, o)));
  let name = match (&part, parent.name.is_empty()) {
    (Some(p), true) => p.clone(),
    (Some(p), false) => format!("{}.{p}", parent.name),
    (None, _) => parent.name.clone(),
  };
  let node = Node {
    id,
    name,
    ft: d
      .get(b"FT")
      .ok()
      .and_then(|o| resolve(doc, o).as_name().ok())
      .map(<[u8]>::to_vec)
      .or(parent.ft.clone()),
    ff: d
      .get(b"Ff")
      .ok()
      .and_then(|o| resolve(doc, o).as_i64().ok())
      .unwrap_or(parent.ff),
    q: d
      .get(b"Q")
      .ok()
      .and_then(|o| resolve(doc, o).as_i64().ok())
      .unwrap_or(parent.q),
    da: d
      .get(b"DA")
      .ok()
      .and_then(|o| text_string(resolve(doc, o)))
      .or(parent.da.clone()),
    widgets: vec![],
  };
  let kids: Vec<ObjectId> = d
    .get(b"Kids")
    .ok()
    .and_then(|o| resolve(doc, o).as_array().ok())
    .map(|a| a.iter().filter_map(|k| k.as_reference().ok()).collect())
    .unwrap_or_default();
  let is_field = |kid: &ObjectId| {
    doc
      .get_object(*kid)
      .and_then(Object::as_dict)
      .is_ok_and(|k| k.has(b"T"))
  };
  if kids.iter().any(is_field) {
    for kid in kids {
      if is_field(&kid) {
        visit(doc, kid, &node, out, depth + 1);
      }
    }
  } else {
    let widgets = if kids.is_empty() { vec![id] } else { kids };
    out.push(Node { widgets, ..node });
  }
}

/// The export values of `/Opt` (an entry is a string, or `[export, display]`).
fn opt(doc: &Document, field: &Dictionary) -> Vec<String> {
  field
    .get(b"Opt")
    .ok()
    .and_then(|o| resolve(doc, o).as_array().ok())
    .map(|a| {
      a.iter()
        .filter_map(|o| match resolve(doc, o) {
          Object::Array(pair) => pair.first().and_then(|e| text_string(resolve(doc, e))),
          other => text_string(other),
        })
        .collect()
    })
    .unwrap_or_default()
}

/// The appearance states of a widget (`/AP /N` keys).
fn widget_states(doc: &Document, widget: ObjectId) -> Vec<Vec<u8>> {
  doc
    .get_object(widget)
    .and_then(Object::as_dict)
    .ok()
    .and_then(|w| w.get(b"AP").ok())
    .and_then(|ap| dict(doc, ap))
    .and_then(|ap| ap.get(b"N").ok())
    .and_then(|n| dict(doc, n))
    .map(|n| n.iter().map(|(k, _)| k.clone()).collect())
    .unwrap_or_default()
}

/// A button state name as pdftk shows it: through `/Opt` when the name is an index into it.
fn state_label(state: &[u8], options: &[String]) -> String {
  let name = String::from_utf8_lossy(state).to_string();
  name
    .parse::<usize>()
    .ok()
    .and_then(|i| options.get(i).cloned())
    .unwrap_or(name)
}

fn kind(ft: Option<&[u8]>) -> Option<FieldType> {
  Some(match ft? {
    b"Tx" => FieldType::Text,
    b"Btn" => FieldType::Button,
    b"Ch" => FieldType::Choice,
    b"Sig" => FieldType::Signature,
    _ => return None,
  })
}

fn describe(doc: &Document, node: &Node) -> Option<Field> {
  let d = doc.get_object(node.id).and_then(Object::as_dict).ok()?;
  let kind = kind(node.ft.as_deref())?;
  let options = opt(doc, d);
  let value_of = |key: &[u8]| {
    d.get(key).ok().map(|o| resolve(doc, o)).and_then(|v| match v {
      Object::Name(n) if kind == FieldType::Button => Some(state_label(n, &options)),
      Object::Array(a) => a.first().and_then(|e| text_string(resolve(doc, e))),
      other => text_string(other),
    })
  };
  let field_options = match kind {
    FieldType::Choice => Some(options.clone()),
    FieldType::Button => {
      let states: BTreeSet<String> = node
        .widgets
        .iter()
        .flat_map(|w| widget_states(doc, *w))
        .map(|s| state_label(&s, &options))
        .collect();
      (!states.is_empty()).then(|| states.into_iter().collect())
    }
    _ => None,
  };
  Some(Field {
    kind,
    name: node.name.clone(),
    title: d.get(b"TU").ok().and_then(|o| text_string(resolve(doc, o))),
    flags: node.ff,
    justification: match node.q {
      1 => Justification::Center,
      2 => Justification::Right,
      _ => Justification::Left,
    },
    value: value_of(b"V"),
    default_value: value_of(b"DV"),
    options: field_options.filter(|o| !o.is_empty()),
  })
}

/// pdftk `dump_data_fields`.
pub fn fields(bytes: &[u8], password: Option<&str>) -> Result<Vec<Field>, PdfError> {
  let doc = open(bytes, password)?;
  Ok(collect(&doc).iter().filter_map(|n| describe(&doc, n)).collect())
}

/// pdftk `generate_fdf`: an FDF file with every field and its value.
pub fn fdf(bytes: &[u8], password: Option<&str>) -> Result<Vec<u8>, PdfError> {
  let fields = fields(bytes, password)?;
  let mut out = b"%FDF-1.2\n%\xE2\xE3\xCF\xD3\n1 0 obj\n<<\n/FDF\n<<\n/Fields [\n".to_vec();
  for field in &fields {
    out.extend_from_slice(b"<<\n/T ");
    out.extend_from_slice(&literal(field.name.as_bytes()));
    match (&field.kind, &field.value) {
      (FieldType::Button, Some(state)) => out.extend_from_slice(format!("\n/V /{}\n", name_token(state)).as_bytes()),
      (FieldType::Button, None) => out.extend_from_slice(b"\n/V /Off\n"),
      (_, value) => {
        out.extend_from_slice(b"\n/V ");
        out.extend_from_slice(&literal(&text_bytes(value.as_deref().unwrap_or(""))));
        out.push(b'\n');
      }
    }
    out.extend_from_slice(b">>\n");
  }
  out.extend_from_slice(b"]\n>>\n>>\nendobj\ntrailer\n\n<<\n/Root 1 0 R\n>>\n%%EOF\n");
  Ok(out)
}

/// A field value as FDF/PDF string bytes: PDFDocEncoding when possible, else UTF-16BE.
fn text_bytes(text: &str) -> Vec<u8> {
  match pdf_string(text) {
    Object::String(bytes, _) => bytes,
    _ => Vec::new(),
  }
}

fn literal(bytes: &[u8]) -> Vec<u8> {
  let mut out = vec![b'('];
  for &b in bytes {
    match b {
      b'(' | b')' | b'\\' => out.extend_from_slice(&[b'\\', b]),
      b'\r' => out.extend_from_slice(b"\\r"),
      b'\n' => out.extend_from_slice(b"\\n"),
      _ => out.push(b),
    }
  }
  out.push(b')');
  out
}

/// A name token: delimiters and non-regular characters as `#xx`.
fn name_token(name: &str) -> String {
  name
    .bytes()
    .map(|b| {
      if b.is_ascii_graphic() && !b"()<>[]{}/%#".contains(&b) {
        (b as char).to_string()
      } else {
        format!("#{b:02X}")
      }
    })
    .collect()
}

/// What `fill_form` does besides setting values (pdftk's flags).
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum FillFlag {
  /// Keep the fields editable; viewers redraw them (`/NeedAppearances`). The default.
  #[default]
  NeedAppearances,
  /// Merge the fields into the page content; the result has no form.
  Flatten,
  /// Draw filled fields with `fontName` (a standard PDF font such as `Helvetica-Bold`).
  ReplacementFont,
}

/// The 14 standard fonts every reader has (no embedding needed).
const STANDARD_FONTS: [&str; 14] = [
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-Oblique",
  "Helvetica-BoldOblique",
  "Times-Roman",
  "Times-Bold",
  "Times-Italic",
  "Times-BoldItalic",
  "Courier",
  "Courier-Bold",
  "Courier-Oblique",
  "Courier-BoldOblique",
  "Symbol",
  "ZapfDingbats",
];

/// pdftk `fill_form`: set field values by fully qualified name. Check boxes and radio buttons
/// take `true` / `false`, or the name of a state (`Yes`, a radio choice). Names that are not
/// fields are ignored, as pdftk does.
pub fn fill(
  bytes: &[u8],
  password: Option<&str>,
  values: &BTreeMap<String, String>,
  flag: FillFlag,
  font_name: Option<&str>,
) -> Result<Vec<u8>, PdfError> {
  let mut doc = open(bytes, password)?;
  let nodes = collect(&doc);
  let replacement = match (flag, font_name) {
    (FillFlag::ReplacementFont, Some(font)) if STANDARD_FONTS.contains(&font) => Some(font_resource(&mut doc, font)),
    (FillFlag::ReplacementFont, Some(font)) => {
      return Err(PdfError::BadRequest(format!(
        "fontName `{font}` is not a standard PDF font ({})",
        STANDARD_FONTS.join(", ")
      )));
    }
    (FillFlag::ReplacementFont, None) => {
      return Err(PdfError::BadRequest("replacement_font needs fontName".into()));
    }
    _ => None,
  };
  for (name, value) in values {
    let Some(node) = nodes.iter().find(|n| &n.name == name) else {
      tracing::debug!(field = %name, "no such form field");
      continue;
    };
    match kind(node.ft.as_deref()) {
      Some(FieldType::Text | FieldType::Choice) => set_text(&mut doc, node, value, replacement.as_ref())?,
      Some(FieldType::Button) if node.ff & PUSHBUTTON == 0 => set_button(&mut doc, node, value)?,
      _ => {}
    }
  }
  if flag == FillFlag::Flatten {
    flatten(&mut doc)?;
  } else if let Some(form) = acroform_mut(&mut doc) {
    form.set("NeedAppearances", Object::Boolean(true));
  }
  save(&mut doc, true)
}

fn acroform_mut(doc: &mut Document) -> Option<&mut Dictionary> {
  let reference = doc.catalog().ok()?.get(b"AcroForm").ok()?.as_reference().ok();
  match reference {
    Some(id) => doc.get_object_mut(id).ok()?.as_dict_mut().ok(),
    None => doc.catalog_mut().ok()?.get_mut(b"AcroForm").ok()?.as_dict_mut().ok(),
  }
}

/// A Type1 standard font object, under a resource name (`/OPdfF0`).
fn font_resource(doc: &mut Document, base_font: &str) -> (Vec<u8>, ObjectId) {
  let mut font = Dictionary::new();
  font.set("Type", Object::Name(b"Font".to_vec()));
  font.set("Subtype", Object::Name(b"Type1".to_vec()));
  font.set("BaseFont", Object::Name(base_font.as_bytes().to_vec()));
  if !matches!(base_font, "Symbol" | "ZapfDingbats") {
    font.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
  }
  let id = doc.add_object(Object::Dictionary(font));
  // Registered in the form's default resources too, for viewers that redraw fields; the
  // appearance streams carry the font themselves.
  if let Some(Ok(Object::Dictionary(dr))) = acroform_mut(doc).map(|form| form.get_mut(b"DR"))
    && let Ok(Object::Dictionary(fonts)) = dr.get_mut(b"Font")
  {
    fonts.set("OPdfF0", Object::Reference(id));
  }
  (b"OPdfF0".to_vec(), id)
}

fn set_text(
  doc: &mut Document,
  node: &Node,
  value: &str,
  replacement: Option<&(Vec<u8>, ObjectId)>,
) -> Result<(), PdfError> {
  if let Ok(Object::Dictionary(d)) = doc.get_object_mut(node.id) {
    d.set("V", pdf_string(value));
  }
  for &widget in &node.widgets {
    let Some(area) = doc
      .get_object(widget)
      .ok()
      .and_then(|o| o.as_dict().ok())
      .and_then(|w| w.get(b"Rect").ok())
      .and_then(|r| rect(doc, r))
    else {
      continue;
    };
    let da = doc
      .get_object(widget)
      .ok()
      .and_then(|o| o.as_dict().ok())
      .and_then(|w| w.get(b"DA").ok())
      .and_then(|o| text_string(resolve(doc, o)))
      .or(node.da.clone())
      .or_else(|| {
        acroform(doc)
          .and_then(|f| f.get(b"DA").ok())
          .and_then(|o| text_string(resolve(doc, o)))
      })
      .unwrap_or_else(|| "/Helv 0 Tf 0 g".into());
    let appearance = text_appearance(doc, &da, area, value, node.q, node.ff & MULTILINE != 0, replacement);
    let ap_id = doc.add_object(appearance);
    if let Ok(Object::Dictionary(w)) = doc.get_object_mut(widget) {
      let mut ap = Dictionary::new();
      ap.set("N", Object::Reference(ap_id));
      w.set("AP", Object::Dictionary(ap));
      if let Some((name, _)) = replacement {
        w.set(
          "DA",
          Object::string_literal(format!("/{} 0 Tf 0 g", String::from_utf8_lossy(name))),
        );
      }
    }
  }
  Ok(())
}

/// Parsed `/DA`: font resource name, size (0 = auto) and the colour operators.
fn parse_da(da: &str) -> (Vec<u8>, f64, String) {
  let tokens: Vec<&str> = da.split_whitespace().collect();
  let tf = tokens.iter().position(|t| *t == "Tf");
  let (font, size) = match tf {
    Some(i) if i >= 2 => (
      tokens[i - 2].trim_start_matches('/').as_bytes().to_vec(),
      tokens[i - 1].parse().unwrap_or(0.0),
    ),
    _ => (b"Helv".to_vec(), 0.0),
  };
  let color: Vec<&str> = match tf {
    Some(i) if i >= 2 => tokens[..i - 2].iter().chain(&tokens[i + 1..]).copied().collect(),
    _ => tokens,
  };
  let color = if color.is_empty() {
    "0 g".to_string()
  } else {
    color.join(" ")
  };
  (font, size, color)
}

/// A form XObject drawing `value` into a widget of `area` (lower left, upper right).
fn text_appearance(
  doc: &mut Document,
  da: &str,
  area: [f64; 4],
  value: &str,
  q: i64,
  multiline: bool,
  replacement: Option<&(Vec<u8>, ObjectId)>,
) -> Stream {
  let (width, height) = (area[2] - area[0], area[3] - area[1]);
  let (da_font, da_size, color) = parse_da(da);
  let (font_name, font_ref) = match replacement {
    Some((name, id)) => (name.clone(), Object::Reference(*id)),
    None => {
      let from_dr = acroform(doc)
        .and_then(|f| f.get(b"DR").ok())
        .and_then(|dr| dict(doc, dr))
        .and_then(|dr| dr.get(b"Font").ok())
        .and_then(|fonts| dict(doc, fonts))
        .and_then(|fonts| fonts.get(&da_font).ok())
        .cloned();
      match from_dr {
        Some(font) => (da_font, font),
        None => {
          let (name, id) = font_resource(doc, "Helvetica");
          (name, Object::Reference(id))
        }
      }
    }
  };
  let lines: Vec<&str> = if multiline {
    value.lines().collect()
  } else {
    vec![value.lines().next().unwrap_or("")]
  };
  let size = if da_size > 0.0 {
    da_size
  } else if multiline {
    12.0
  } else {
    ((height - 4.0) * 0.75).clamp(4.0, 12.0)
  };
  // Helvetica-like average advance; only used to centre or right-align.
  let text_width = |s: &str| s.chars().count() as f64 * size * 0.5;
  let mut content = format!(
    "/Tx BMC\nq\n1 1 {:.2} {:.2} re W n\nBT\n/{} {size:.2} Tf\n{color}\n",
    (width - 2.0).max(0.0),
    (height - 2.0).max(0.0),
    String::from_utf8_lossy(&font_name)
  )
  .into_bytes();
  for (i, line) in lines.iter().enumerate() {
    let x = match q {
      1 => ((width - text_width(line)) / 2.0).max(2.0),
      2 => (width - 2.0 - text_width(line)).max(2.0),
      _ => 2.0,
    };
    let y = if multiline {
      height - 2.0 - size * (i as f64 + 1.0) * 1.15 + size * 0.15
    } else {
      (height - size) / 2.0 + size * 0.22
    };
    let encoded: Vec<u8> = line
      .chars()
      .map(|c| u8::try_from(u32::from(c)).unwrap_or(b'?'))
      .collect();
    content.extend_from_slice(format!("1 0 0 1 {x:.2} {y:.2} Tm\n").as_bytes());
    content.extend_from_slice(&literal(&encoded));
    content.extend_from_slice(b" Tj\n");
  }
  content.extend_from_slice(b"ET\nQ\nEMC\n");
  let mut fonts = Dictionary::new();
  fonts.set(font_name, font_ref);
  let mut resources = Dictionary::new();
  resources.set("Font", Object::Dictionary(fonts));
  let mut d = Dictionary::new();
  d.set("Type", Object::Name(b"XObject".to_vec()));
  d.set("Subtype", Object::Name(b"Form".to_vec()));
  d.set(
    "BBox",
    Object::Array(vec![
      0.into(),
      0.into(),
      Object::Real(width as f32),
      Object::Real(height as f32),
    ]),
  );
  d.set("Resources", Object::Dictionary(resources));
  Stream::new(d, content)
}

fn set_button(doc: &mut Document, node: &Node, value: &str) -> Result<(), PdfError> {
  let options = doc
    .get_object(node.id)
    .and_then(Object::as_dict)
    .map(|d| opt(doc, d))
    .unwrap_or_default();
  let states: Vec<(ObjectId, Vec<Vec<u8>>)> = node.widgets.iter().map(|w| (*w, widget_states(doc, *w))).collect();
  let on_states: Vec<&Vec<u8>> = states
    .iter()
    .flat_map(|(_, s)| s.iter())
    .filter(|s| s.as_slice() != b"Off")
    .collect();
  let target: Vec<u8> = match value.trim().to_ascii_lowercase().as_str() {
    "true" | "on" | "yes" | "1" if !on_states.iter().any(|s| s.as_slice() == value.as_bytes()) => on_states
      .first()
      .map(|s| (*s).clone())
      .unwrap_or_else(|| b"Yes".to_vec()),
    "false" | "off" | "no" | "" => b"Off".to_vec(),
    _ => on_states
      .iter()
      .find(|s| s.as_slice() == value.as_bytes() || state_label(s, &options) == value)
      .map(|s| (*s).clone())
      .ok_or_else(|| {
        let labels: BTreeSet<String> = on_states.iter().map(|s| state_label(s, &options)).collect();
        PdfError::BadRequest(format!(
          "{}: `{value}` is not true, false or one of {}",
          node.name,
          labels.into_iter().collect::<Vec<_>>().join(", ")
        ))
      })?,
  };
  if let Ok(Object::Dictionary(d)) = doc.get_object_mut(node.id) {
    d.set("V", Object::Name(target.clone()));
  }
  for (widget, widget_states) in states {
    let state = if widget_states.contains(&target) {
      target.clone()
    } else {
      b"Off".to_vec()
    };
    if let Ok(Object::Dictionary(w)) = doc.get_object_mut(widget) {
      w.set("AS", Object::Name(state));
    }
  }
  Ok(())
}

/// Draw every widget's appearance into its page and remove the form (pdftk `flatten`).
pub fn flatten(doc: &mut Document) -> Result<(), PdfError> {
  for (_, page) in doc.get_pages() {
    let annots: Vec<Object> = match doc
      .get_object(page)
      .and_then(Object::as_dict)
      .and_then(|d| d.get(b"Annots"))
    {
      Ok(a) => resolve(doc, a).as_array().cloned().unwrap_or_default(),
      Err(_) => continue,
    };
    let mut keep = Vec::new();
    let mut drawing = Vec::new();
    for annot in annots {
      let Some(a) = dict(doc, &annot) else { continue };
      if a.get(b"Subtype").and_then(Object::as_name).ok() != Some(b"Widget") {
        keep.push(annot);
        continue;
      }
      let hidden = a.get(b"F").and_then(Object::as_i64).unwrap_or(0) & 2 != 0;
      if hidden {
        continue;
      }
      if let Some((stream, area)) = appearance(doc, a) {
        drawing.push((stream, area));
      }
    }
    let mut content = Vec::new();
    for (stream, area) in drawing {
      let Some(transform) = form_placement(doc, stream, area) else {
        continue;
      };
      if let Ok(Object::Stream(s)) = doc.get_object_mut(stream) {
        s.dict.set("Type", Object::Name(b"XObject".to_vec()));
        s.dict.set("Subtype", Object::Name(b"Form".to_vec()));
      }
      let name = add_xobject(doc, page, "OPdfFlat", stream)?;
      let [a, b, c, d, e, f] = transform;
      content.extend_from_slice(
        format!(
          "q {a:.4} {b:.4} {c:.4} {d:.4} {e:.4} {f:.4} cm /{} Do Q\n",
          String::from_utf8_lossy(&name)
        )
        .as_bytes(),
      );
    }
    if !content.is_empty() {
      wrap_content(doc, page, None, Some(content))?;
    }
    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(page) {
      if keep.is_empty() {
        d.remove(b"Annots");
      } else {
        d.set("Annots", Object::Array(keep));
      }
    }
  }
  if let Ok(catalog) = doc.catalog_mut() {
    catalog.remove(b"AcroForm");
  }
  doc.prune_objects();
  Ok(())
}

/// A widget's normal appearance stream (the `/AS` state of a state dictionary) and its `/Rect`.
fn appearance(doc: &Document, widget: &Dictionary) -> Option<(ObjectId, [f64; 4])> {
  let area = rect(doc, widget.get(b"Rect").ok()?)?;
  let n = dict(doc, widget.get(b"AP").ok()?)?.get(b"N").ok()?;
  let stream = match n {
    Object::Reference(id) if doc.get_object(*id).is_ok_and(|o| o.as_stream().is_ok()) => *id,
    other => {
      let states = dict(doc, other)?;
      let state = widget.get(b"AS").ok().and_then(|s| s.as_name().ok())?;
      states.get(state).ok()?.as_reference().ok()?
    }
  };
  Some((stream, area))
}

/// The `cm` matrix that maps a form's bounding box (after its `/Matrix`) onto `area`
/// (ISO 32000-1, 12.5.5).
fn form_placement(doc: &Document, stream: ObjectId, area: [f64; 4]) -> Option<[f64; 6]> {
  let s = doc.get_object(stream).ok()?.as_stream().ok()?;
  let bbox = rect(doc, s.dict.get(b"BBox").ok()?)?;
  let m: Vec<f64> = s
    .dict
    .get(b"Matrix")
    .ok()
    .and_then(|o| resolve(doc, o).as_array().ok())
    .map(|a| a.iter().filter_map(|v| number(resolve(doc, v))).collect())
    .filter(|v: &Vec<f64>| v.len() == 6)
    .unwrap_or_else(|| vec![1.0, 0.0, 0.0, 1.0, 0.0, 0.0]);
  let corners = [
    (bbox[0], bbox[1]),
    (bbox[2], bbox[1]),
    (bbox[0], bbox[3]),
    (bbox[2], bbox[3]),
  ]
  .map(|(x, y)| (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]));
  let (min_x, max_x) = corners
    .iter()
    .fold((f64::MAX, f64::MIN), |(lo, hi), c| (lo.min(c.0), hi.max(c.0)));
  let (min_y, max_y) = corners
    .iter()
    .fold((f64::MAX, f64::MIN), |(lo, hi), c| (lo.min(c.1), hi.max(c.1)));
  let (bw, bh) = (max_x - min_x, max_y - min_y);
  if bw <= 0.0 || bh <= 0.0 {
    return None;
  }
  let (sx, sy) = ((area[2] - area[0]) / bw, (area[3] - area[1]) / bh);
  Some([sx, 0.0, 0.0, sy, area[0] - min_x * sx, area[1] - min_y * sy])
}

/// Field values from query parameters: everything but the options of `/form/fill`.
pub fn values_from_query(pairs: Vec<(String, String)>) -> (BTreeMap<String, String>, Vec<(String, String)>) {
  let mut values = BTreeMap::new();
  let mut options = Vec::new();
  for (key, value) in pairs {
    if matches!(key.as_str(), "flag" | "fontName") {
      options.push((key, value));
    } else {
      values.insert(key, value);
    }
  }
  (values, options)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_default_appearance() {
    assert_eq!(parse_da("/Arial 12 Tf 0 g"), (b"Arial".to_vec(), 12.0, "0 g".into()));
    assert_eq!(
      parse_da("0 0 1 rg /Helv 0 Tf"),
      (b"Helv".to_vec(), 0.0, "0 0 1 rg".into())
    );
    assert_eq!(parse_da(""), (b"Helv".to_vec(), 0.0, "0 g".into()));
  }

  #[test]
  fn escapes_names_and_strings() {
    assert_eq!(name_token("Check Box1"), "Check#20Box1");
    assert_eq!(literal(b"a(b)c\\"), b"(a\\(b\\)c\\\\)".to_vec());
  }

  #[test]
  fn labels_states_through_opt() {
    assert_eq!(state_label(b"0", &["Choice1".into()]), "Choice1");
    assert_eq!(state_label(b"Off", &["Choice1".into()]), "Off");
    assert_eq!(state_label(b"Yes", &[]), "Yes");
  }
}
