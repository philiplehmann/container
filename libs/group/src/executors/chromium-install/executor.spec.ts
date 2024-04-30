import executor from './executor';
import { describe, it, expect } from 'vitest';

describe.skip('groupBuild Executor', () => {
  it('can run', async () => {
    const output = await executor({});
    expect(output.success).toBe(true);
  });
});
