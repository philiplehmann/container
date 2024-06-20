import { promiseSpawn } from '@container/docker';
import type { E2EInstallExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<E2EInstallExecutorSchema> = async () => {
  if (process.env.RUNNER_OS === 'Linux') {
    try {
      await promiseSpawn('sudo', ['apt-get', 'update']);
      await promiseSpawn('sudo', ['apt-get', 'install', 'ghostscript', '--yes', '--no-install-recommends']);
      await promiseSpawn('sudo', [
        'sed',
        '-i',
        's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/',
        '/etc/ImageMagick-6/policy.xml',
      ]);
    } catch (error) {
      console.error('could not install ghostscript and imagemagick', error);
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
