import { promiseSpawn } from '@container/docker';
import type { ChromiumInstallExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<ChromiumInstallExecutorSchema> = async () => {
  if (process.env.RUNNER_OS === 'Linux') {
    try {
      await promiseSpawn('sudo', ['apt-get', 'install', 'ghostscript', '--yes', '--no-install-recommends']);
      await promiseSpawn('sudo',
        ['sed', '-i', 's/$SRC/$RPL/', '/etc/ImageMagick-6/policy.xml'],
        {
          env: {
            DQT: '"',
            SRC: 'rights=${DQT}none${DQT} pattern=${DQT}PDF${DQT}',
            RPL: 'rights=${DQT}read\|write${DQT} pattern=${DQT}PDF${DQT}'
          }
        }
      );
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
