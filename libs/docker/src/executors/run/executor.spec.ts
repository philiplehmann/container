import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import executor from './executor';
import type { DockerRunExecutorSchema } from './schema';

const options: DockerRunExecutorSchema = {
  image: 'https://ghcr.io/philiplehmann/container/build:test',
  file: 'Dockerfile',
  port: '3000',
};

describe.skip('DockerRun Executor', () => {
  it('can run', async () => {
    const output = await executor(options, {} as never);
    assert.strictEqual(output.success, true);
  });
});
