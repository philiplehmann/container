import type { Executor } from '@nx/devkit';
import { commonArgs, pathReplacer, runCargo } from '../../lib/cargo';
import type { CargoInstallExecutorSchema } from './schema';

/** `cargo fetch`: download every dependency, so later steps can run with `--offline`. */
const cargoInstallExecutor: Executor<CargoInstallExecutorSchema> = async (options, context) => {
  return runCargo(context, ['fetch'], commonArgs(options, pathReplacer(context)), options);
};

export default cargoInstallExecutor;
