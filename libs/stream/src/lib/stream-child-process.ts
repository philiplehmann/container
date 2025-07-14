import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';

export type InputType = Readable | Buffer | string;

export interface StreamChildProcessOptions {
  end?: boolean;
}

export async function streamInputToWriteable(
  input: InputType,
  writable: Writable,
  options?: StreamChildProcessOptions,
): Promise<void> {
  const { end = true } = options ?? {};
  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    writable.write(input);
    if (end) {
      writable.end();
    }
  } else {
    await finished(input.pipe(writable, { end }));
  }
}

export async function streamChildProcess(
  input: InputType,
  output: Writable,
  child: ChildProcessWithoutNullStreams,
  options?: StreamChildProcessOptions,
): Promise<void> {
  const { end = true } = options ?? {};
  child.stdin.on('error', (error) => {
    console.error(error);
  });

  await streamInputToWriteable(input, child.stdin, { end: true });

  child.stdout
    .on('error', (error) => {
      console.error(error);
    })
    .pipe(output, { end });

  child.stderr
    .on('error', (error) => {
      console.error(error);
    })
    .pipe(process.stderr);

  output.on('close', () => {
    child.kill();
  });
  await finished(child.stdout);
}
