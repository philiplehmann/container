import { constants } from 'node:fs';
import { access, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { type Schema as LibreofficeSchema, libreoffice } from '@container/binary/libreoffice';
import { BadRequest } from '@container/http/error';
import { resolvePathUnderRoot } from './path-safety';

export interface DirectFsConvertOptions {
  inputAbsolutePath: string;
  outputAbsolutePath: string;
  convertTo: LibreofficeSchema['convertTo'];
  outputFilter?: LibreofficeSchema['outputFilter'];
  filterOptions?: LibreofficeSchema['filterOptions'];
}

export interface DirectFsConvertResult {
  outputBytes: number;
  durationMs: number;
}

async function assertReadableInputFile(inputAbsolutePath: string): Promise<void> {
  try {
    await access(inputAbsolutePath, constants.R_OK);
    const inputStats = await stat(inputAbsolutePath);
    if (!inputStats.isFile()) {
      throw new BadRequest('Input path must point to a file');
    }
  } catch (error) {
    if (error instanceof BadRequest) {
      throw error;
    }
    throw new BadRequest('Input file not found or not readable');
  }
}

export async function directFsConvert({
  inputAbsolutePath,
  outputAbsolutePath,
  convertTo,
  outputFilter,
  filterOptions,
}: DirectFsConvertOptions): Promise<DirectFsConvertResult> {
  await assertReadableInputFile(inputAbsolutePath);
  await mkdir(dirname(outputAbsolutePath), { recursive: true });

  const startedAt = Date.now();

  await libreoffice({
    input: inputAbsolutePath,
    output: outputAbsolutePath,
    convertTo,
    outputFilter,
    filterOptions,
  });

  const outputStats = await stat(outputAbsolutePath);

  return {
    outputBytes: outputStats.size,
    durationMs: Date.now() - startedAt,
  };
}

const pendingWrites = new Map<string, Promise<DirectFsConvertResult>>();

export async function convertWithSerializedWrites(options: DirectFsConvertOptions): Promise<DirectFsConvertResult> {
  const previousWrite = pendingWrites.get(options.outputAbsolutePath);
  const currentWrite = (async () => {
    if (previousWrite) {
      await previousWrite;
    }

    return await directFsConvert(options);
  })();

  pendingWrites.set(options.outputAbsolutePath, currentWrite);

  try {
    return await currentWrite;
  } finally {
    if (pendingWrites.get(options.outputAbsolutePath) === currentWrite) {
      pendingWrites.delete(options.outputAbsolutePath);
    }
  }
}

export interface DirectFsConvertRequestOptions {
  inputRoot: string;
  outputRoot: string;
  inputPath: string;
  outputPath: string;
  convertTo: LibreofficeSchema['convertTo'];
  outputFilter?: LibreofficeSchema['outputFilter'];
  filterOptions?: LibreofficeSchema['filterOptions'];
}

export async function handleDirectFsConvert(options: DirectFsConvertRequestOptions): Promise<DirectFsConvertResult> {
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
