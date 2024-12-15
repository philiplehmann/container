import type { DockerTestExecutorSchema } from './schema';
import executor from './executor';
import { describe, it, expect } from 'vitest';
import { cwd } from 'node:process';
import { currentArch } from '../../docker-helper';

const options: DockerTestExecutorSchema = {
  platforms: [currentArch()],
  tag: 'https://ghcr.io/philiplehmann/container/build:test',
  file: 'Dockerfile',
};

describe.skip('DockerTest Executor', () => {
  it('can run', async () => {
    const output = (await executor(options, {
      root: cwd(),
      cwd: cwd(),
      isVerbose: false,
    })) as { success: boolean };
    expect(output.success).toBe(true);
  });
});
