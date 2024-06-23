import { spawn } from 'node:child_process';
import { streamChildProcess, streamChildProcessToBuffer, type InputType } from '@container/stream';
import type { Writable } from 'node:stream';

export function imageToText(options: { input: InputType; output: Writable }): void;
export function imageToText(options: { input: InputType }): Promise<Buffer>;
export function imageToText({ input, output }: { input: InputType; output?: Writable }) {
  const tesseract = spawn('tesseract', ['-', '-']);
  if (output) {
    return streamChildProcess(input, output, tesseract);
  }
  return streamChildProcessToBuffer(input, tesseract);
}
