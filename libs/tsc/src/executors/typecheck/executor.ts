import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Executor } from '@nx/devkit';
import { projectRoot, promiseSpawn } from '@riwi/nx';
import type { TscTypecheckExecutorSchema } from './schema';

export interface TypecheckExecutorOptions {
  tsConfig: string;
}

const possibleTsConfigs = [
  'tsconfig.lib.json',
  'tsconfig.app.json',
  'tsconfig.spec.json',
  'tsconfig.json',
  'tsconfig.base.json',
];

const tscTypecheckExecutor: Executor<TscTypecheckExecutorSchema> = async (
  { tsconfig = 'tsconfig.lib.json' },
  context,
) => {
  const root = projectRoot(context);

  if (!existsSync(resolve(root, tsconfig))) {
    for (const config of possibleTsConfigs) {
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
