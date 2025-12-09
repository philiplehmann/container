import { describe, expect, it } from 'bun:test';
import type { ExecutorContext } from '@nx/devkit';
import executor from './executor';

describe.skip('helperBuild Executor', () => {
  it('can run', async () => {
    const output = await executor({}, {} as ExecutorContext);
    expect(output.success).toBe(true);
  });
});
