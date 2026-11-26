import type { CargoCommonOptions } from '../../lib/cargo';

export interface CargoFormatExecutorSchema
  extends Pick<CargoCommonOptions, 'toolchain' | 'manifestPath' | 'package' | 'args' | 'env'> {
  check?: boolean;
}
