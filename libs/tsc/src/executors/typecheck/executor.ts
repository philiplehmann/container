import { resolve } from 'node:path';
import { promiseSpawn } from '@container/docker';
import { getTsConfigPath, projectRoot } from '@container/nx';
import type { Executor } from '@nx/devkit';
import type { TscTypecheckExecutorSchema } from './schema';

export interface TypecheckExecutorOptions {
  tsConfig: string;
}

const tscTypecheckExecutor: Executor<TscTypecheckExecutorSchema> = async (
  { tsconfig = 'tsconfig.spec.json' },
  context,
) => {
  const root = projectRoot(context);

  tsconfig = getTsConfigPath(tsconfig, root);
  try {
    await promiseSpawn('node_modules/.bin/tsc', ['--noEmit', '-p', resolve(root, tsconfig)], {
      cwd: context.root,
      env: process.env,
    });
    return { success: true };
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
    return { success: false };
  }
};

export default tscTypecheckExecutor;
