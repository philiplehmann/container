import type { Readable, Writable } from 'node:stream';
import { streamChildProcess } from '@container/stream';
import { z } from 'zod';
import { type PdftkOptions, pdftk } from './pdftk';

export const encryptSchema = z.strictObject({
  password: z.string(),
  userPassword: z.string().optional(),
  allow: z
    .enum([
      'Printing', // Top Quality Printing
      'DegradedPrinting', // Lower Quality Printing
      'ModifyContents', // Also allows Assembly
      'Assembly',
      'CopyContents', // Also allows ScreenReaders
      'ScreenReaders',
      'ModifyAnnotations', // Also allows FillIn
      'FillIn',
      'AllFeatures', // Allows the user to perform all of the above, and top quality printing.
    ])
    .optional(),
});

export async function encryptStream(
  {
    input,
    output,
    password,
    userPassword,
    allow,
  }: { input: Readable; output: Writable; password: string; userPassword?: string; allow?: string },
  options?: PdftkOptions,
): Promise<void> {
  const args = [];
  if (userPassword) {
    args.push('user_pw', userPassword);
  }
  if (allow) {
    args.push('allow', allow);
  }
  return streamChildProcess(input, output, pdftk(['-', 'output', '-', 'owner_pw', password, ...args], options));
}
