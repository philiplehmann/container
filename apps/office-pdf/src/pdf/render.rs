//! Page images (poppler `pdftoppm` / `pdftocairo`), rendered with craft-libs' hayro.

use craft_pdf::interpret::InterpreterSettings;
use craft_pdf::raster::{self, RenderCache};

use super::PdfError;
use crate::convert::OutputType;

/// Render the 1-based `pages` at `dpi` as `format` images, on white.
pub fn render(
  bytes: &[u8],
  password: Option<&str>,
  pages: &[u32],
  dpi: f32,
  format: OutputType,
  quality: u8,
) -> Result<Vec<Vec<u8>>, PdfError> {
  if !(1.0..=1200.0).contains(&dpi) {
    return Err(PdfError::BadRequest(format!("dpi {dpi} is not within 1-1200")));
  }
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
  let cache = RenderCache::new();
  let settings = InterpreterSettings::default();
  let scale = dpi / 72.0;
  let options = raster::Options {
    scale: [scale, scale],
    background: [255, 255, 255, 255],
    ..Default::default()
  };
  pages
    .iter()
    .map(|&number| {
      let page = all
        .get(number.saturating_sub(1) as usize)
        .ok_or_else(|| PdfError::BadRequest(format!("no page {number}, the PDF has {count}")))?;
      let raster = raster::render(page, &cache, &settings, &options).map_err(|e| match e {
        raster::Error::OutputLimit => PdfError::BadRequest(format!(
          "page {number} at {dpi} dpi is larger than {} pixels a side; use a lower dpi",
          raster::MAX_SIDE
        )),
        other => PdfError::Invalid(format!("page {number}: {other}")),
      })?;
      // Opaque background: premultiplied and straight alpha are the same.
      let image = image::RgbaImage::from_raw(raster.width, raster.height, raster.bytes().to_vec())
        .ok_or_else(|| PdfError::Write("raster size".into()))?;
      encode(image, format, quality)
    })
    .collect()
}

fn encode(image: image::RgbaImage, format: OutputType, quality: u8) -> Result<Vec<u8>, PdfError> {
  let mut out = std::io::Cursor::new(Vec::new());
  let result = match format {
    OutputType::Jpeg => {
      let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, quality);
      image::DynamicImage::ImageRgba8(image)
        .to_rgb8()
        .write_with_encoder(encoder)
    }
    OutputType::Webp => image.write_to(&mut out, image::ImageFormat::WebP),
    OutputType::Png | OutputType::Pdf => image.write_to(&mut out, image::ImageFormat::Png),
  };
  result.map_err(|e| PdfError::Write(e.to_string()))?;
  Ok(out.into_inner())
}
