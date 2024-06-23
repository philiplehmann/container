import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { streamToBuffer } from './stream-to-buffer';
import type { InputType } from './stream-child-process';

export async function streamChildProcessToBuffer(
  input: InputType,
  child: ChildProcessWithoutNullStreams,
): Promise<Buffer> {
  child.stdin.on('error', (error) => {
    console.error(error);
  });

  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    child.stdin.end(input);
  } else {
    input.pipe(child.stdin, { end: true });
  }

  child.stderr.pipe(process.stderr).on('error', (error) => {
    console.error(error);
  });
  return streamToBuffer(child.stdout);
}
