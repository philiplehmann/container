import { promiseSpawn } from '@container/docker';
import { projectRoot as getProjectRoot } from '@container/nx';
import type { Executor } from '@nx/devkit';
import type { BiomejsExecutorSchema } from './schema';

const runExecutor: Executor<BiomejsExecutorSchema> = async (
  { fix, changed, 'log-level': logLevel, verbose },
  context,
) => {
  const projectRoot = getProjectRoot(context);

  if (!projectRoot) {
    throw new Error('Project root not found');
  }

  const args: string[] = ['check'];
  if (fix) {
    args.push('--write');
  }

  if (changed) {
    args.push('--changed');
  }

  if (verbose) {
    args.push('--verbose');
  }

  if (logLevel) {
    args.push('--log-level', logLevel);
  }

  try {
    await promiseSpawn('bun', ['biome', ...args, '.'], {
      cwd: projectRoot,
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
};

export default runExecutor;
