import type { Schema as LibreofficeSchema } from '@riwi/binary/libreoffice';
import { convertWithSerializedWrites, type DirectFsConvertResult } from './directFsConvert';
import { resolvePathUnderRoot } from './path-safety';

export interface DirectFsConvertOptions {
  inputAbsolutePath: string;
  outputAbsolutePath: string;
  convertTo: LibreofficeSchema['convertTo'];
  outputFilter?: LibreofficeSchema['outputFilter'];
  filterOptions?: LibreofficeSchema['filterOptions'];
}

export interface ConvertOptions {
  inputRoot: string;
  outputRoot: string;
  inputPath: string;
  outputPath: string;
  convertTo: LibreofficeSchema['convertTo'];
  outputFilter?: LibreofficeSchema['outputFilter'];
  filterOptions?: LibreofficeSchema['filterOptions'];
}

export async function convert(options: ConvertOptions): Promise<DirectFsConvertResult> {
  const inputAbsolutePath = resolvePathUnderRoot(options.inputRoot, options.inputPath, 'inputPath');
  const outputAbsolutePath = resolvePathUnderRoot(options.outputRoot, options.outputPath, 'outputPath');

  return await convertWithSerializedWrites({
    inputAbsolutePath,
    outputAbsolutePath,
    convertTo: options.convertTo,
    outputFilter: options.outputFilter,
    filterOptions: options.filterOptions,
  });
}
