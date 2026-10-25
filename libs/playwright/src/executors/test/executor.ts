import type { Executor } from '@nx/devkit';
import { projectRoot, promiseSpawn } from '@riwi/nx';
import { playwrightTestArgs } from './args';
import type { PlaywrightTestExecutorSchema } from './schema';

const playwrightTestExecutor: Executor<PlaywrightTestExecutorSchema> = async (options, context) => {
  const root = projectRoot(context);
  try {
    await promiseSpawn('bun', ['playwright', ...playwrightTestArgs(options)], {
      env: { ...options.env, ...process.env },
      cwd: root,
    });
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

export default playwrightTestExecutor;
