import { z } from 'zod';
import type { Readable, Writable } from 'node:stream';
import { pdftk, type PdftkOptions } from './pdftk';
import { streamChildProcess } from '@container/stream';

export const decryptSchema = z.strictObject({
  password: z.string(),
});

export async function decryptStream(
  { input, output, password }: { input: Readable; output: Writable; password: string },
  options?: PdftkOptions,
): Promise<void> {
  return streamChildProcess(input, output, pdftk(['-', 'input_pw', password, 'output', '-'], options));
}
