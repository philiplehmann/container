import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';

export type InputType = Readable | Buffer | string;

export interface StreamChildProcessOptions {
  end?: boolean;
}

export const isEpipeError = (error: unknown): boolean => {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'EPIPE';
};

const writeToWritable = (writable: Writable, chunk: string | Buffer): Promise<void> => {
  return new Promise((resolve, reject) => {
    writable.write(chunk, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const endWritable = (writable: Writable): Promise<void> => {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      writable.off('error', onError);
      reject(error);
    };
    writable.on('error', onError);
    writable.end(() => {
      writable.off('error', onError);
      resolve();
    });
  });
};

export async function streamInputToWriteable(
  input: InputType,
  writable: Writable,
  options?: StreamChildProcessOptions,
): Promise<void> {
  const { end = true } = options ?? {};
  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    await writeToWritable(writable, input);
    if (end) {
      await endWritable(writable);
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
    if (!isEpipeError(error)) {
      console.error(error);
    }
  });

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

  const inputPromise = streamInputToWriteable(input, child.stdin, { end: true }).catch((error) => {
    if (isEpipeError(error)) {
      return;
    }
    child.kill();
    throw error;
  });

  const stdoutPromise = finished(child.stdout).then(() => {
    stdoutFinished = true;
  });

  const [inputResult, stdoutResult, exitResult] = await Promise.allSettled([inputPromise, stdoutPromise, exitPromise]);
  const stderrOutput = Buffer.concat(stderrChunks).toString('utf-8');

  if (inputResult.status === 'rejected') {
    const message = inputResult.reason instanceof Error ? inputResult.reason.message : String(inputResult.reason);
    if (stderrOutput) {
      throw new Error(`${message}: ${stderrOutput}`);
    }
    throw inputResult.reason;
  }

  if (exitResult.status === 'rejected') {
    throw exitResult.reason;
  }

  const { code, signal } = exitResult.value;

  if (code !== 0) {
    if (code === null && signal) {
      throw new Error(`Child process exited with signal ${signal}${stderrOutput ? `: ${stderrOutput}` : ''}`);
    }
    throw new Error(`Child process exited with code ${code}${stderrOutput ? `: ${stderrOutput}` : ''}`);
  }

  if (stdoutResult.status === 'rejected') {
    const message = stdoutResult.reason instanceof Error ? stdoutResult.reason.message : String(stdoutResult.reason);
    if (stderrOutput) {
      throw new Error(`${message}: ${stderrOutput}`);
    }
    throw stdoutResult.reason;
  }
}
