import { promiseSpawn } from '@container/docker';
import type { PromiseExecutor } from '@nx/devkit';
import type { E2EInstallExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<E2EInstallExecutorSchema> = async () => {
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
    await promiseSpawn('bun', ['playwright', 'install', '--with-deps', 'chromium']);
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
