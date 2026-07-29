import type { ChildProcessWithoutNullStreams } from 'node:child_process';

export async function awaitChildProcess(child: ChildProcessWithoutNullStreams): Promise<void> {
  const stderrChunks: Buffer[] = [];
  child.stderr.on('data', (chunk) => {
    stderrChunks.push(Buffer.from(chunk));
  });

  child.stderr.on('error', (error) => {
    console.error(error);
  });

  child.stdout.on('error', (error) => {
    console.error(error);
  });

  // Set up exit listener before awaiting to avoid race condition
  const exitResult = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on('exit', (code, signal) => {
      resolve({ code, signal });
    });
  });

  const stderrOutput = Buffer.concat(stderrChunks).toString('utf-8');

  const { code, signal } = exitResult;

  if (code !== 0) {
    if (code === null && signal) {
      throw new Error(`Child process exited with signal ${signal}${stderrOutput ? `: ${stderrOutput}` : ''}`);
    }
    throw new Error(`Child process exited with code ${code}${stderrOutput ? `: ${stderrOutput}` : ''}`);
  }
}
