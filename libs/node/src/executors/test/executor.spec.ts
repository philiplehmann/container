import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { ExecutorContext } from '@nx/devkit';

import type { NodeTestExecutorSchema } from './schema';
import executor from './executor';

const options: NodeTestExecutorSchema = {
  path: 'some/path',
};

describe.skip('NodeTest Executor', () => {
  it('can run', async () => {
    const output = (await executor(options, {} as ExecutorContext)) as any;
    assert.strictEqual(output.success, true);
  });
});
