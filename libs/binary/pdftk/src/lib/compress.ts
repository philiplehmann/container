import type { Readable, Writable } from 'node:stream';
import { streamChildProcess } from '@riwi/stream';
import { type PdftkOptions, pdftk } from './pdftk';

export async function compressStream(
  { input, output }: { input: Readable; output: Writable },
  options?: PdftkOptions,
): Promise<void>;
export async function compressStream(
  { input, output }: { input: string; output: string },
  options?: PdftkOptions,
): Promise<void>;
export async function compressStream(
  { input, output }: { input: Readable | string; output: Writable | string },
  options?: PdftkOptions,
): Promise<void> {
  if (typeof input === 'string' && typeof output === 'string') {
    await pdftk([input, 'output', output, 'compress'], options);
    return;
  }
  if (typeof input === 'string' || typeof output === 'string') {
    throw new Error('input and output must both be streams or both be file paths');
  }
  return streamChildProcess(input, output, pdftk(['-', 'output', '-', 'compress'], options));
}
