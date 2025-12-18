import { relative, resolve } from 'node:path';
import { cwd } from 'node:process';
import { promiseSpawn } from '@container/docker';
import { projectRoot as getProjectRoot } from '@container/nx';
import type { Executor, ExecutorContext } from '@nx/devkit';
import type { BunBuildExecutorSchema } from './schema';

const replacePlaceholders = (context: ExecutorContext) => {
  const projectRoot = getProjectRoot(context);
  const workspaceRoot = context.root;
  const relativeWorkspaceRoot = relative(cwd(), workspaceRoot);
  const replace = {
    '{projectRoot}': projectRoot,
    '{workspaceRoot}': relativeWorkspaceRoot === '' ? '.' : relativeWorkspaceRoot,
  };
  return (path: string) => Object.entries(replace).reduce((acc, [key, value]) => acc.replaceAll(key, value), path);
};

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
    return { success: true };
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
    return { success: false };
  }
};

export default bunBuildExecutor;
