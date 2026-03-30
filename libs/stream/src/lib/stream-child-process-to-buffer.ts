import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { type InputType, isEpipeError, streamInputToWriteable } from './stream-child-process';
import { streamToBuffer } from './stream-to-buffer';

export async function streamChildProcessToBuffer(
  input: InputType,
  child: ChildProcessWithoutNullStreams,
): Promise<Buffer> {
  const stderrChunks: Buffer[] = [];

  child.stderr.on('data', (chunk) => {
    const stderrChunk = Buffer.from(chunk);
    stderrChunks.push(stderrChunk);
    process.stderr.write(stderrChunk);
  });

  child.stderr.on('error', (error) => {
    console.error(error);
  });

  child.stdin.on('error', (error) => {
    if (!isEpipeError(error)) {
      console.error(error);
    }
  });

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
  const outputPromise = streamToBuffer(child.stdout);

  const [inputResult, outputResult, exitResult] = await Promise.allSettled([inputPromise, outputPromise, exitPromise]);

  const stderrOutput = Buffer.concat(stderrChunks).toString('utf-8');

  if (inputResult.status === 'rejected') {
    const message = inputResult.reason instanceof Error ? inputResult.reason.message : String(inputResult.reason);
    if (stderrOutput) {
      throw new Error(`${message}: ${stderrOutput}`);
    }
    throw inputResult.reason;
  }

  if (outputResult.status === 'rejected') {
    const message = outputResult.reason instanceof Error ? outputResult.reason.message : String(outputResult.reason);
    if (stderrOutput) {
      throw new Error(`${message}: ${stderrOutput}`);
    }
    throw outputResult.reason;
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

  return outputResult.value;
}
