//! Text extraction (poppler `pdftotext`, `pdftohtml`), with craft-libs' hayro interpreter: each
//! glyph's Unicode text and position, grouped into lines in reading order.

use craft_pdf::interpret::TransformExt;
use craft_pdf::interpret::font::Glyph;
use craft_pdf::interpret::hayro_cmap::BfString;
use craft_pdf::interpret::{
  BlendMode, ClipPath, Context, Device, GlyphDrawMode, Image, InterpreterCache, InterpreterSettings, Paint,
  PathDrawMode, SoftMask,
};
use kurbo::{Affine, BezPath, Point, Rect, Shape};

use super::PdfError;

/// One glyph: its text, the left of its box, its baseline (top-down) and size, in points.
#[derive(Debug, Clone)]
struct Run {
  text: String,
  x: f64,
  right: f64,
  baseline: f64,
  size: f64,
}

struct Collector {
  /// The visible page (crop box), top-down: glyphs outside it are not extracted, as poppler.
  width: f64,
  height: f64,
  runs: Vec<Run>,
}

impl Device<'_> for Collector {
  fn set_soft_mask(&mut self, _: Option<SoftMask<'_>>) {}
  fn set_blend_mode(&mut self, _: BlendMode) {}
  fn draw_path(&mut self, _: &BezPath, _: Affine, _: &Paint<'_>, _: &PathDrawMode) {}
  fn push_clip_path(&mut self, _: &ClipPath) {}
  fn push_transparency_group(&mut self, _: f32, _: Option<SoftMask<'_>>, _: BlendMode) {}
  fn draw_image(&mut self, _: Image<'_, '_>, _: Affine) {}
  fn pop_clip_path(&mut self) {}
  fn pop_transparency_group(&mut self) {}

  fn draw_glyph(
    &mut self,
    glyph: &Glyph<'_>,
    transform: Affine,
    glyph_transform: Affine,
    _: &Paint<'_>,
    _: &GlyphDrawMode,
  ) {
    let Some(text) = glyph.as_unicode() else { return };
    let text = match text {
      BfString::Char(c) => c.to_string(),
      BfString::String(s) => s,
    };
    // The context starts with the page's own transform: top-down, rotation applied.
    let full = transform * glyph_transform;
    let origin = full * Point::ZERO;
    // Glyph outlines are in a 1000 unit em: the em square's height is the font size.
    let em = (full * Point::new(0.0, 1000.0)) - origin;
    let size = em.hypot().max(1.0);
    // The advance (1000 units per em) is where the next glyph would start; the outline's
    // extent stands in when the font has no width for the glyph.
    let advance = match glyph {
      Glyph::Outline(outline) => outline.advance_width(),
      Glyph::Type3(glyph) => glyph.advance_width(),
    };
    let right = match (advance, glyph) {
      (Some(advance), _) if advance > 0.0 => (full * Point::new(f64::from(advance), 0.0)).x,
      (_, Glyph::Outline(outline)) => {
        let bounds = (full * outline.outline()).bounding_box();
        if bounds.width() > 0.0 {
          bounds.x1
        } else {
          origin.x + size * 0.25
        }
      }
      _ => origin.x + size * 0.5,
    };
    let visible = (-1.0..=self.width + 1.0).contains(&origin.x) && (-1.0..=self.height + 1.0).contains(&origin.y);
    if visible {
      self.runs.push(Run {
        text,
        x: origin.x,
        right: right.max(origin.x),
        baseline: origin.y,
        size,
      });
    }
  }
}

/// A line of text and where it starts on the page.
#[derive(Debug, Clone)]
pub struct Line {
  pub text: String,
  pub x: f64,
  /// Top of the line (top-down, points).
  pub top: f64,
  pub size: f64,
}

/// One page's text: its lines, top to bottom.
#[derive(Debug, Clone)]
pub struct PageText {
  pub width: f64,
  pub height: f64,
  pub lines: Vec<Line>,
}

/// The text of the 1-based `pages` (all when empty).
pub fn extract(bytes: &[u8], password: Option<&str>, pages: &[u32]) -> Result<Vec<PageText>, PdfError> {
  let pdf = craft_pdf::open_slice(bytes, password).map_err(|e| {
    let message = e.to_string();
    if message.to_ascii_lowercase().contains("password") {
      if password.is_some() {
        PdfError::WrongPassword
      } else {
        PdfError::PasswordRequired
      }
    } else {
      PdfError::Invalid(message)
    }
  })?;
  let all = pdf.pages();
  let count = all.len() as u32;
  let selected: Vec<u32> = if pages.is_empty() {
    (1..=count).collect()
  } else {
    pages.to_vec()
  };
  let cache = InterpreterCache::new();
  let mut out = Vec::with_capacity(selected.len());
  for number in selected {
    let Some(page) = all.get(number.saturating_sub(1) as usize) else {
      return Err(PdfError::BadRequest(format!("no page {number}, the PDF has {count}")));
    };
    let (width, height) = page.render_dimensions();
    let mut context = Context::new(
      page.initial_transform(true).to_kurbo(),
      Rect::new(0.0, 0.0, f64::from(width), f64::from(height)),
      &cache,
      pdf.xref(),
      InterpreterSettings::default(),
    );
    let mut collector = Collector {
      width: f64::from(width),
      height: f64::from(height),
      runs: Vec::new(),
    };
    craft_pdf::interpret_page(page, &mut context, &mut collector)
      .map_err(|e| PdfError::Invalid(format!("page {number}: {e}")))?;
    out.push(PageText {
      width: f64::from(width),
      height: f64::from(height),
      lines: lines(collector.runs),
    });
  }
  Ok(out)
}

/// Group glyphs into lines: glyphs whose baselines are close form a line, ordered left to right;
/// a gap wider than a fraction of the font size becomes a space.
fn lines(mut runs: Vec<Run>) -> Vec<Line> {
  runs.retain(|r| !r.text.chars().all(char::is_control));
  runs.sort_by(|a, b| a.baseline.total_cmp(&b.baseline));
  let mut groups: Vec<Vec<Run>> = Vec::new();
  for run in runs {
    match groups.last_mut() {
      Some(group) if (group[0].baseline - run.baseline).abs() <= group[0].size.min(run.size) * 0.4 => group.push(run),
      _ => groups.push(vec![run]),
    }
  }
  groups
    .into_iter()
    .filter_map(|mut group| {
      group.sort_by(|a, b| a.x.total_cmp(&b.x));
      let size = group.iter().map(|r| r.size).fold(0.0, f64::max);
      let mut text = String::new();
      let mut previous: Option<&Run> = None;
      for run in &group {
        if let Some(p) = previous {
          let gap = run.x - p.right;
          let space_before = run.text.starts_with(' ') || text.ends_with(' ');
          if gap > run.size.min(p.size) * 0.18 && !space_before {
            text.push(' ');
          }
          // Glyphs drawn twice (fake bold) at the same spot appear once.
          if (run.x - p.x).abs() < 0.01 && run.text == p.text {
            continue;
          }
        }
        text.push_str(&run.text);
        previous = Some(run);
      }
      let text = text.trim_end().to_string();
      (!text.trim().is_empty()).then(|| Line {
        x: group[0].x,
        top: group[0].baseline - size * 0.8,
        size,
        text,
      })
    })
    .collect()
}

/// pdftotext's output: the lines of each page, pages separated by a form feed.
pub fn to_text(pages: &[PageText]) -> String {
  let mut out = String::new();
  for page in pages {
    let mut previous: Option<&Line> = None;
    for line in &page.lines {
      // A blank line where the vertical gap says a paragraph ended.
      if let Some(p) = previous
        && line.top - p.top > p.size.max(line.size) * 2.0
      {
        out.push('\n');
      }
      out.push_str(&line.text);
      out.push('\n');
      previous = Some(line);
    }
    out.push('\u{c}');
  }
  out
}

/// pdftohtml's single-file output (`-noframes`): each page a positioned block of its lines.
pub fn to_html(pages: &[PageText], title: &str) -> String {
  let mut out = format!(
    "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<title>{}</title>\n<style>\n\
         .page{{position:relative;margin:0 auto 16px;border:1px solid #ccc;background:#fff}}\n\
         .page p{{position:absolute;margin:0;white-space:pre;font-family:sans-serif;line-height:1}}\n\
         </style>\n</head>\n<body>\n",
    escape(title)
  );
  for (i, page) in pages.iter().enumerate() {
    out.push_str(&format!(
      "<div class=\"page\" id=\"page{}\" style=\"width:{:.0}px;height:{:.0}px\">\n",
      i + 1,
      page.width,
      page.height
    ));
    for line in &page.lines {
      out.push_str(&format!(
        "<p style=\"top:{:.1}px;left:{:.1}px;font-size:{:.1}px\">{}</p>\n",
        line.top.max(0.0),
        line.x.max(0.0),
        line.size,
        escape(&line.text)
      ));
    }
    out.push_str("</div>\n");
  }
  out.push_str("</body>\n</html>\n");
  out
}

fn escape(text: &str) -> String {
  text
    .replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
  use super::*;

  fn run(text: &str, x: f64, baseline: f64) -> Run {
    Run {
      text: text.into(),
      x,
      right: x + 5.0,
      baseline,
      size: 10.0,
    }
  }

  #[test]
  fn groups_glyphs_into_lines() {
    let lines = lines(vec![
      run("b", 20.0, 100.0),
      run("H", 10.0, 50.0),
      run("i", 15.0, 50.5),
      run("a", 10.0, 100.0),
      run("x", 40.0, 100.0),
    ]);
    let texts: Vec<&str> = lines.iter().map(|l| l.text.as_str()).collect();
    assert_eq!(texts, ["Hi", "a b x"]);
  }

  #[test]
  fn escapes_html() {
    assert_eq!(escape("<a & \"b\">"), "&lt;a &amp; &quot;b&quot;&gt;");
  }
}
