import { describe, expect, it } from 'vitest';
import executor from './executor';
import type { PythonInstallExecutorSchema } from './schema';

const options: PythonInstallExecutorSchema = {
  requirements: 'apps/easyocr/requirements.txt',
};

describe.skip('PythonInstall Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
