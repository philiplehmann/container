import type { Readable, Writable } from 'node:stream';
import { pdftk, type PdftkOptions } from './pdftk';
import { streamChildProcess } from '@container/stream';

export async function dataFdfStream(
  { input, output }: { input: Readable; output: Writable },
  options?: PdftkOptions,
): Promise<void> {
  return streamChildProcess(input, output, pdftk(['-', 'generate_fdf', 'output', '-'], options));
}
