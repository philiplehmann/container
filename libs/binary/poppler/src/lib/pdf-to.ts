import { spawn } from 'node:child_process';
import type { Writable } from 'node:stream';
import { type InputType, streamChildProcess, streamChildProcessToBuffer } from '@container/stream';
import type { ConvertTo } from './convert-to';

export function pdfTo(options: { input: InputType; output: Writable; to: ConvertTo }): Promise<void>;
export function pdfTo(options: { input: InputType; to: ConvertTo }): Promise<Buffer>;
export function pdfTo({
  input,
  output,
  to,
}: {
  input: InputType;
  output?: Writable;
  to: ConvertTo;
}): Promise<void> | Promise<Buffer> {
  const command = (() => {
    switch (to) {
      case 'text':
        return spawn('pdftotext', ['-', '-']);
      case 'html':
        return spawn('pdftohtml', ['-stdout', '-noframes', '-', '-']);
      default:
        throw new Error(`Unsupported conversion to ${to}`);
    }
  })();

  if (output) {
    return streamChildProcess(input, output, command);
  }
  return streamChildProcessToBuffer(input, command);
}
