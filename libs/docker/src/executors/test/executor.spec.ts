import { describe, expect, it } from 'bun:test';
import { cwd } from 'node:process';
import type { ExecutorContext } from '@nx/devkit';
import executor from './executor';
import type { DockerTestExecutorSchema } from './schema';

const options: DockerTestExecutorSchema = {
  tag: 'https://ghcr.io/philiplehmann/container/build:test',
  file: 'Dockerfile',
};

describe.skip('DockerTest Executor', () => {
  it('can run', async () => {
    const output = (await executor(options, {
      root: cwd(),
      cwd: cwd(),
      isVerbose: false,
    } as ExecutorContext)) as { success: boolean };
    expect(output.success).toBe(true);
  });
});
