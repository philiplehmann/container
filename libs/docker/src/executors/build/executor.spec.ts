import { describe, expect, it } from 'bun:test';
import { currentArch } from '../../docker-helper';
import executor from './executor';
import type { DockerBuildExecutorSchema } from './schema';

const options: DockerBuildExecutorSchema = {
  platforms: [currentArch()],
  file: 'Dockerfile',
  tags: ['https://ghcr.io/philiplehmann/container/build:test'],
};

describe.skip('DockerBuild Executor', () => {
  it('can run', async () => {
    const output = (await executor(options, {} as never)) as {
      success: boolean;
    };
    expect(output.success).toBe(true);
  });
});
