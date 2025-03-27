import type { PythonInstallExecutorSchema } from './schema';
import executor from './executor';
import { describe, it, expect } from 'vitest';

const options: PythonInstallExecutorSchema = {
  requirements: 'apps/easyocr/requirements.txt',
};

describe.skip('PythonInstall Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
