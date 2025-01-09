import { z } from 'zod';
import type { Readable, Writable } from 'node:stream';
import { pdftk, type PdftkOptions } from './pdftk';
import { streamChildProcess } from '@container/stream';

export const concatSchema = z.strictObject({
  count: z.string(),
});

export async function concat(
  {
    input,
    output,
    password,
    userPassword,
    allow,
  }: { input: Readable[]; output: Writable; count: number; },
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
