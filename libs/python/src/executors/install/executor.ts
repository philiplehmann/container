import { promiseSpawn } from '@container/docker';
import type { Executor } from '@nx/devkit';
import type { PythonInstallExecutorSchema } from './schema';

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
