import type { DockerBuildExecutorSchema } from './schema';
import executor from './executor';
import { describe, it, expect } from 'vitest';
import { currentArch } from '../../docker-helper';

const options: DockerBuildExecutorSchema = {
  platforms: [currentArch()],
  file: 'Dockerfile',
  tags: ['https://ghcr.io/philiplehmann/container/build:test'],
};

describe.skip('DockerBuild Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
