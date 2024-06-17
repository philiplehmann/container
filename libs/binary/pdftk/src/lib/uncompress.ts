import type { Readable, Writable } from 'node:stream';
import { pdftk, type PdftkOptions } from './pdftk';
import { streamChildProcess } from '@container/stream';

export async function uncompressStream(
  { input, output }: { input: Readable; output: Writable },
  options?: PdftkOptions,
): Promise<void> {
  return streamChildProcess(input, output, pdftk(['-', 'output', '-', 'uncompress'], options));
}
