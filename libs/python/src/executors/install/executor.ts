import type { PythonInstallExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';
import { promiseSpawn } from '@container/docker';

const runExecutor: Executor<PythonInstallExecutorSchema> = async (options) => {
  try {
    await promiseSpawn('python3', ['-m', 'pip', 'install', '-r', options.requirements]);
    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
    };
  }
};

export default runExecutor;
