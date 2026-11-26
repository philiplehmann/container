import type { Executor } from '@nx/devkit';
import { commonArgs, compileArgs, pathReplacer, runCargo } from '../../lib/cargo';
import type { CargoBuildExecutorSchema } from './schema';

export const buildArgs = ({ bin = [], allTargets }: CargoBuildExecutorSchema): string[] => [
  ...bin.flatMap((name) => ['--bin', name]),
  ...(allTargets ? ['--all-targets'] : []),
];

const cargoBuildExecutor: Executor<CargoBuildExecutorSchema> = async (options, context) => {
  return runCargo(
    context,
    ['build'],
    [...commonArgs(options, pathReplacer(context)), ...compileArgs(options), ...buildArgs(options)],
    options,
  );
};

export default cargoBuildExecutor;
