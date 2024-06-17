import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Readable } from 'node:stream';
import { streamToBuffer } from './stream-to-buffer';

export async function streamChildProcessToBuffer(
  input: Readable,
  child: ChildProcessWithoutNullStreams,
): Promise<Buffer> {
  input.pipe(child.stdin, { end: true }).on('error', (error) => {
    console.error(error);
  });

  child.stderr.pipe(process.stderr).on('error', (error) => {
    console.error(error);
  });
  return streamToBuffer(child.stdout);
}
