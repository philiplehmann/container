import type { Readable, Writable } from 'node:stream';
import { streamChildProcess } from '@container/stream';
import { z } from 'zod';
import { type PdftkOptions, pdftk } from './pdftk';

export const decryptSchema = z.strictObject({
  password: z.string(),
});

export async function decryptStream(
  { input, output, password }: { input: Readable; output: Writable; password: string },
  options?: PdftkOptions,
): Promise<void> {
  return streamChildProcess(input, output, pdftk(['-', 'input_pw', password, 'output', '-'], options));
}
