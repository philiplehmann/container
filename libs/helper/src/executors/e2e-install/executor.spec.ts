import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import executor from './executor';

describe.skip('helperBuild Executor', () => {
  it('can run', async () => {
    const output = await executor({});
    assert.strictEqual(output.success, true);
  });
});
