import { spawn } from 'node:child_process';
import type { Writable } from 'node:stream';
import { type InputType, streamChildProcess, streamChildProcessToBuffer } from '@container/stream';
import type { ConvertTo } from './convert-to';

export function unoconvert(options: { input: InputType; output: Writable; to: ConvertTo }): void;
export function unoconvert(options: { input: InputType; to: ConvertTo }): Promise<Buffer>;
export function unoconvert({ input, output, to }: { input: InputType; output?: Writable; to: ConvertTo }) {
  const unoconvert = spawn('unoconvert', ['--convert-to', to, '-', '-']);
  if (output) {
    return streamChildProcess(input, output, unoconvert);
  }
  return streamChildProcessToBuffer(input, unoconvert);
}
