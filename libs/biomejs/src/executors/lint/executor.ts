import { promiseSpawn } from '@container/docker';
import type { Executor } from '@nx/devkit';
import type { BiomejsExecutorSchema } from './schema';

const runExecutor: Executor<BiomejsExecutorSchema> = async (
  { fix, changed, 'log-level': logLevel, verbose },
  context,
) => {
  const projectRoot = context.projectName && context.projectsConfigurations?.projects[context.projectName].root;

  if (!projectRoot) {
    throw new Error('Project root not found');
  }

  const args: string[] = [];
  if (fix) {
    args.push('check', '--write');
  } else {
    args.push('check');
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
