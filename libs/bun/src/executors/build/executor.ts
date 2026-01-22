import { relative, resolve } from 'node:path';
import { cwd } from 'node:process';
import { promiseSpawn } from '@container/docker';
import { projectRoot as getProjectRoot, replacePlaceholders } from '@container/nx';
import type { Executor, ExecutorContext } from '@nx/devkit';
import { copyPackageJson, createEntryPoints } from '@nx/js';
import type { BunBuildExecutorSchema } from './schema';

const bunBuildExecutor: Executor<BunBuildExecutorSchema> = async (
  { entrypoints, outdir, target, format, packages },
  context,
) => {
  const replace = replacePlaceholders(context);
  const projectRoot = getProjectRoot(context);

  const args = [
    'build',
    '--target',
    target,
    '--outdir',
    replace(outdir),
    '--format',
    format,
    '--packages',
    packages,
    '--root',
    resolve(projectRoot),
    ...entrypoints.map(replace),
  ];
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

  try {
    context.target = context.target || {};
    context.target.options = context.target.options || {};
    context.target.options.tsConfig = context.target.options.tsConfig || resolve(projectRoot, 'tsconfig.json');
    await copyPackageJson(
      {
        main: entrypoints[0] || '',
        outputPath: replace(outdir),
        additionalEntryPoints: createEntryPoints([], context.root),
        format: [format === 'esm' ? 'esm' : 'cjs'],
      },
      context,
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
    return { success: false };
  }
  return { success: true };
};

export default bunBuildExecutor;
