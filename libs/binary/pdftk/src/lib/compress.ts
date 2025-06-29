import type { Readable, Writable } from 'node:stream';
import { streamChildProcess } from '@container/stream';
import { type PdftkOptions, pdftk } from './pdftk';

export async function compressStream(
  { input, output }: { input: Readable; output: Writable },
  options?: PdftkOptions,
): Promise<void> {
  return streamChildProcess(input, output, pdftk(['-', 'output', '-', 'compress'], options));
}
