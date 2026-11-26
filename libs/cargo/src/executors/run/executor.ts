import type { Executor } from '@nx/devkit';
import { commonArgs, compileArgs, pathReplacer, runCargo } from '../../lib/cargo';
import type { CargoRunExecutorSchema } from './schema';

const cargoRunExecutor: Executor<CargoRunExecutorSchema> = async (options, context) => {
  return runCargo(
    context,
    ['run'],
    [
      ...commonArgs(options, pathReplacer(context)),
      ...compileArgs(options),
      ...(options.bin ? ['--bin', options.bin] : []),
    ],
    options,
    options.runArgs,
  );
};

export default cargoRunExecutor;
