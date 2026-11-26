import type { Executor } from '@nx/devkit';
import { commonArgs, compileArgs, pathReplacer, runCargo } from '../../lib/cargo';
import { formatArgs } from '../format/executor';
import type { CargoLintExecutorSchema } from './schema';

export const clippyArgs = ({ fix, allTargets = true }: CargoLintExecutorSchema): string[] => [
  ...(allTargets ? ['--all-targets'] : []),
  ...(fix ? ['--fix', '--allow-dirty', '--allow-staged'] : []),
];

/** `cargo fmt --check` (or `cargo fmt` with `fix`), then `cargo clippy`. */
const cargoLintExecutor: Executor<CargoLintExecutorSchema> = async (options, context) => {
  const { fix, denyWarnings = true, checkFormat = true } = options;
  const replace = pathReplacer(context);

  if (checkFormat) {
    const format = await runCargo(context, ['fmt'], formatArgs({ ...options, check: !fix }, replace), {
      toolchain: options.toolchain,
      env: options.env,
    });
    if (!format.success) {
      return format;
    }
  }

  return runCargo(
    context,
    ['clippy'],
    [...commonArgs(options, replace), ...compileArgs(options), ...clippyArgs(options)],
    options,
    denyWarnings && !fix ? ['-D', 'warnings'] : [],
  );
};

export default cargoLintExecutor;
