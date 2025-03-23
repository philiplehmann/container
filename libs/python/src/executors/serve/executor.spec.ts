import type { PythonServeExecutorSchema } from './schema';
import executor from './executor';
import { describe, it, expect } from 'vitest';

const options: PythonServeExecutorSchema = {
  entrypoint: 'apps/easyocr/src/main.py',
  args: [],
};

describe.skip('PythonServe Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
