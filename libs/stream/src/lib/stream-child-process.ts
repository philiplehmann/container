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
    child.kill();
  });

  try {
    await streamInputToWriteable(input, child.stdin, { end: true });
  } catch (error) {
    child.kill();
    throw error;
  }

  child.stdout
    .on('error', (error) => {
      console.error(error);
    })
    .pipe(output, { end });

  const stderrChunks: Buffer[] = [];
  child.stderr.on('data', (chunk) => {
    stderrChunks.push(Buffer.from(chunk));
  });

  child.stderr.on('error', (error) => {
    console.error(error);
  });

  output.on('close', () => {
    child.kill();
  });

  // Set up exit listener before awaiting to avoid race condition
  const exitPromise = new Promise<number | null>((resolve) => {
    child.on('exit', (code) => {
      resolve(code);
    });
  });

  await finished(child.stdout);

  // Wait for the process to exit and check the exit code
  const exitCode = await exitPromise;

  if (exitCode !== 0) {
    const stderrOutput = Buffer.concat(stderrChunks).toString('utf-8');
    throw new Error(`Child process exited with code ${exitCode}${stderrOutput ? `: ${stderrOutput}` : ''}`);
  }
}
