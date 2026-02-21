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
  const stderrChunks: Buffer[] = [];
  child.stderr.on('data', (chunk) => {
    stderrChunks.push(Buffer.from(chunk));
  });

  child.stderr.on('error', (error) => {
    console.error(error);
  });

  child.stdin.on('error', (error) => {
    console.error(error);
    child.kill();
  });

  try {
    await streamInputToWriteable(input, child.stdin, { end: true });
  } catch (error) {
    child.kill();
    const stderrOutput = Buffer.concat(stderrChunks).toString('utf-8');
    if (stderrOutput) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${message}: ${stderrOutput}`);
    }
    throw error;
  }

  child.stdout
    .on('error', (error) => {
      console.error(error);
    })
    .pipe(output, { end });

  let stdoutFinished = false;

  output.on('close', () => {
    if (!stdoutFinished) {
      child.kill();
    }
  });

  // Set up exit listener before awaiting to avoid race condition
  const exitPromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on('exit', (code, signal) => {
      resolve({ code, signal });
    });
  });

  await finished(child.stdout);
  stdoutFinished = true;

  // Wait for the process to exit and check the exit code
  const { code, signal } = await exitPromise;

  if (code !== 0) {
    const stderrOutput = Buffer.concat(stderrChunks).toString('utf-8');
    if (code === null && signal) {
      throw new Error(`Child process exited with signal ${signal}${stderrOutput ? `: ${stderrOutput}` : ''}`);
    }
    throw new Error(`Child process exited with code ${code}${stderrOutput ? `: ${stderrOutput}` : ''}`);
  }
}
