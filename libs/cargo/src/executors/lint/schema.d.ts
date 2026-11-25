import type { CargoCompileOptions } from '../../lib/cargo';

export interface CargoLintExecutorSchema extends CargoCompileOptions {
  fix?: boolean;
  allTargets?: boolean;
  denyWarnings?: boolean;
  checkFormat?: boolean;
}
