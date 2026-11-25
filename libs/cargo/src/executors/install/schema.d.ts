import type { CargoCommonOptions } from '../../lib/cargo';

export type CargoInstallExecutorSchema = Omit<CargoCommonOptions, 'package' | 'targetDir'>;
