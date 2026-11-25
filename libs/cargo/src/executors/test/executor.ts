import type { Executor } from '@nx/devkit';
import { commonArgs, compileArgs, pathReplacer, runCargo } from '../../lib/cargo';
import type { CargoTestExecutorSchema } from './schema';

export const testArgs = ({ testName, noFailFast, doc }: CargoTestExecutorSchema): string[] => [
  ...(noFailFast ? ['--no-fail-fast'] : []),
  ...(doc ? ['--doc'] : []),
  ...(testName ? [testName] : []),
];

const cargoTestExecutor: Executor<CargoTestExecutorSchema> = async (options, context) => {
  return runCargo(
    context,
    ['test'],
    [...commonArgs(options, pathReplacer(context)), ...compileArgs(options), ...testArgs(options)],
    options,
    options.testArgs,
  );
};

export default cargoTestExecutor;
