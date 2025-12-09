import { describe, expect, it } from 'bun:test';
import { cwd } from 'node:process';
import type { ExecutorContext } from '@nx/devkit';
import executor from './executor';
import type { NodeTestExecutorSchema } from './schema';

const options: NodeTestExecutorSchema = {};

describe.skip('NodeTest Executor', () => {
  it('can run', async () => {
    const output = (await executor(options, { root: cwd() } as ExecutorContext)) as {
      success: boolean;
    };
    expect(output.success).toBe(true);
  });
});
