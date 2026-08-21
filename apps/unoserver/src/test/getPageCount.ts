import { PDFDocument } from 'pdf-lib';

export async function getPageCount(pdfBuffer: string) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  return pdfDoc.getPageCount();
}
