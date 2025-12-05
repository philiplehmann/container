import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { cwd } from 'node:process';
import { currentArch } from '../../docker-helper';
import executor from './executor';
import type { DockerTestExecutorSchema } from './schema';

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
    assert.strictEqual(output.success, true);
  });
});
