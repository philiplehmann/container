import type { CargoCompileOptions } from '../../lib/cargo';

export interface CargoRunExecutorSchema extends CargoCompileOptions {
  bin?: string;
  runArgs?: string[];
}
