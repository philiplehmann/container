import { PDFDocument } from 'pdf-lib';

export async function getPageCount(pdfBuffer: Buffer | Uint8Array | ArrayBuffer | string) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  return pdfDoc.getPageCount();
}
