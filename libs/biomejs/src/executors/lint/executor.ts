import { promiseSpawn } from '@container/executors';
import type { BiomejsExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<BiomejsExecutorSchema> = async (
  { fix, changed, 'log-level': logLevel, verbose },
  context,
) => {
  const projectRoot = context.projectsConfigurations.projects[context.projectName].root;
  const args: string[] = [];
  if (fix) {
    args.push('format', '--write');
  } else {
    args.push('lint');
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
    await promiseSpawn('yarn', ['biome', ...args, '.'], {
      cwd: projectRoot,
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
};

export default runExecutor;
