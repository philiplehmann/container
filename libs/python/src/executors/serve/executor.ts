import type { Executor } from '@nx/devkit';
import { promiseSpawn } from '@container/docker';
import type { PythonServeExecutorSchema } from './schema';

const runExecutor: Executor<PythonServeExecutorSchema> = async (options) => {
  console.log('serve', options);
  try {
    await promiseSpawn('python3', [options.entrypoint, ...(options.args || [])]);
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
