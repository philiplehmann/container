import type { Executor } from '@nx/devkit';
import { pathReplacer, runCargo } from '../../lib/cargo';
import type { CargoFormatExecutorSchema } from './schema';

export const formatArgs = (
  { manifestPath, package: pkg, check }: CargoFormatExecutorSchema,
  replace: (path: string) => string = (p) => p,
): string[] => [
  '--manifest-path',
  replace(manifestPath ?? '{projectRoot}/Cargo.toml'),
  ...(pkg ? ['--package', pkg] : []),
  ...(check ? ['--check'] : []),
];

const cargoFormatExecutor: Executor<CargoFormatExecutorSchema> = async (options, context) => {
  return runCargo(context, ['fmt'], formatArgs(options, pathReplacer(context)), options);
};

export default cargoFormatExecutor;
