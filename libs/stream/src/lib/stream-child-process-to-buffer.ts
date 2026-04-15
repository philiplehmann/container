import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { processTracker } from './process-tracker';
import type { InputType } from './stream-child-process';
import { streamToBuffer } from './stream-to-buffer';

export interface StreamChildProcessToBufferOptions {
  /** Enable process tracking. Default: true */
  track?: boolean;
}

export async function streamChildProcessToBuffer(
  input: InputType,
  child: ChildProcessWithoutNullStreams,
  options?: StreamChildProcessToBufferOptions,
): Promise<Buffer> {
  const { track = true } = options ?? {};

  // Register for tracking
  if (track) {
    processTracker.register(child);
  }

  child.stdin.on('error', (error) => {
    console.error(error);
  });

  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    child.stdin.end(input);
  } else if (input) {
    input.pipe(child.stdin, { end: true });
  }

  child.stderr.pipe(process.stderr).on('error', (error) => {
    console.error(error);
  });
  return streamToBuffer(child.stdout);
}
