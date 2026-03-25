import { constants, createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { type Schema as LibreofficeSchema, libreoffice } from '@container/binary/libreoffice';
import { BadRequest } from '@container/http/error';

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
    input: createReadStream(inputAbsolutePath),
    output: createWriteStream(outputAbsolutePath),
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
