import { ConvertTo } from './convert-to';

export const ConvertToMimeType = Object.freeze({
  [ConvertTo.pdf]: 'application/pdf',
  [ConvertTo.png]: 'image/png',
  [ConvertTo.jpeg]: 'image/jpeg',
  [ConvertTo.webp]: 'image/webp',
} as const);
