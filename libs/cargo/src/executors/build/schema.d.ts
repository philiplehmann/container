import type { CargoCompileOptions } from '../../lib/cargo';

export interface CargoBuildExecutorSchema extends CargoCompileOptions {
  bin?: string[];
  allTargets?: boolean;
}
