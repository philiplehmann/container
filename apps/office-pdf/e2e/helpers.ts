import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDF } from '@libpdf/core';

export const assets = resolve(dirname(fileURLToPath(import.meta.url)), '../tests/assets');
export const asset = (name: string) => resolve(assets, name);
export const containerPort = 5000;
export const image = (arch: string) => `philiplehmann/office-pdf:test-${arch}`;

export async function getPageCount(pdf: Uint8Array) {
  return (await PDF.load(pdf)).getPages().length;
}
