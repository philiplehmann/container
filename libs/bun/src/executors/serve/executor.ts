import type { Executor } from '@nx/devkit';
import { promiseSpawn } from '@riwi/docker';
import { replacePlaceholders } from '@riwi/nx';
import type { BunServeExecutorSchema } from './schema';

const bunBuildExecutor: Executor<BunServeExecutorSchema> = async ({ entrypoint }, context) => {
  const replace = replacePlaceholders(context);

  const args = ['run', '--watch', replace(entrypoint)];
  try {
    await promiseSpawn('bun', args, {
      cwd: context.root,
      env: process.env,
    });
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
    return { success: false };
  }
  return { success: true };
};

export default bunBuildExecutor;
