import { DockerRunExecutorSchema } from './schema';
import executor from './executor';
import { describe, it, expect } from 'vitest';

const options: DockerRunExecutorSchema = {
  image: 'https://ghcr.io/philiplehmann/container/build:test',
  file: 'Dockerfile',
  port: '3000',
};

describe.skip('DockerRun Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
