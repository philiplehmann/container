import { describe, expect, it } from 'bun:test';
import type { ExecutorContext } from '@nx/devkit';
import { cwd } from 'process';
import executor from './executor';
import type { TscTypecheckExecutorSchema } from './schema';

const options: TscTypecheckExecutorSchema = {};

describe.skip('typescript typecheck', () => {
  it('can run', async () => {
    const output = (await executor(options, { root: cwd() } as ExecutorContext)) as {
      success: boolean;
    };
    expect(output.success).toBe(true);
  });
});
