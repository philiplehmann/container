import { promiseSpawn } from '@container/docker';
import type { E2EInstallExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<E2EInstallExecutorSchema> = async () => {
  if (process.env.RUNNER_OS === 'Linux') {
    try {
      await promiseSpawn('sudo', ['apt-get', 'update']);
      await promiseSpawn('sudo', ['apt-get', 'install', 'poppler-utils', '--yes', '--no-install-recommends']);
    } catch (error) {
      console.error('could not install poppler-utils', error);
      return {
        success: false,
      };
    }
  }
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
