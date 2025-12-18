import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { promiseSpawn } from '@container/docker';
import { projectRoot } from '@container/nx';
import type { Executor } from '@nx/devkit';
import type { TscTypecheckExecutorSchema } from './schema';

export interface TypecheckExecutorOptions {
  tsConfig: string;
}

const possibleTsConfigs = [
  'tsconfig.spec.json',
  'tsconfig.base.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.lib.json',
];

const tscTypecheckExecutor: Executor<TscTypecheckExecutorSchema> = async (
  { tsconfig = 'tsconfig.spec.json' },
  context,
) => {
  const root = projectRoot(context);

  if (existsSync(resolve(root, tsconfig))) {
    for (const config in possibleTsConfigs) {
      if (existsSync(resolve(root, config))) {
        tsconfig = config;
        break;
      }
    }
  }
  try {
    await promiseSpawn('tsc', ['--noEmit', '-p', resolve(root, tsconfig)], {
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
