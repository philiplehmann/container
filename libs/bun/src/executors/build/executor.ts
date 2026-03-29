import { copyFile, glob } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Executor } from '@nx/devkit';
import { copyPackageJson, createEntryPoints } from '@nx/js';
import { promiseSpawn } from '@riwi/docker';
import { projectRoot as getProjectRoot, replacePlaceholders } from '@riwi/nx';
import type { BunBuildExecutorSchema } from './schema';

const bunBuildExecutor: Executor<BunBuildExecutorSchema> = async (
  { entrypoints, outdir, target, format, packages, assets },
  context,
) => {
  const replace = replacePlaceholders(context);
  const projectRoot = getProjectRoot(context);
  const globEntrypoints = await Array.fromAsync(glob(entrypoints.map(replace)));
  const globAssets = await Array.fromAsync(glob((assets ?? []).map(replace)));

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
    ...globEntrypoints,
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
    await Promise.all(
      globAssets.map((asset) => {
        return copyFile(resolve(context.root, asset), resolve(replace(outdir), asset.replace(`${projectRoot}/`, '')));
      }),
    );
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
