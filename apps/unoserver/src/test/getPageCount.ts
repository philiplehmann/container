import { PDF } from '@libpdf/core';

export async function getPageCount(pdfBuffer: Uint8Array) {
  const pdfDoc = await PDF.load(pdfBuffer);
  return pdfDoc.getPages().length;
}
