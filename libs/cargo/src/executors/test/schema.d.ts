import type { CargoCompileOptions } from '../../lib/cargo';

export interface CargoTestExecutorSchema extends CargoCompileOptions {
  testName?: string;
  noFailFast?: boolean;
  doc?: boolean;
  testArgs?: string[];
}
