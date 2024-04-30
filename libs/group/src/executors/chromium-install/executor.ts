import { promiseSpawn } from '@container/docker';
import type { ChromiumInstallExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<ChromiumInstallExecutorSchema> = async () => {
  try {
    await promiseSpawn('yarn', ['playwright', 'install', '--with-deps', 'chromium']);
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
