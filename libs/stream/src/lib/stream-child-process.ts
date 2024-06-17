import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';

export interface StreamChildProcessOptions {
  end?: boolean;
}

export async function streamChildProcess(
  input: Readable,
  output: Writable,
  child: ChildProcessWithoutNullStreams,
  options?: StreamChildProcessOptions,
): Promise<void> {
  const { end = true } = options ?? {};
  input.pipe(child.stdin, { end: true }).on('error', (error) => {
    console.error(error);
  });
  child.stdout.pipe(output, { end }).on('error', (error) => {
    console.error(error);
  });

  child.stderr.pipe(process.stderr).on('error', (error) => {
    console.error(error);
  });

  output.on('close', () => {
    child.kill();
  });
  await finished(child.stdout);
}
