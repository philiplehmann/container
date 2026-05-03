import { libreoffice } from '@riwi/binary/libreoffice';
import { mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { assertReadableInputFile } from './assertReadableInputFile';
import type { DirectFsConvertOptions } from './convert';

const pendingWrites = new Map<string, Promise<DirectFsConvertResult>>();

export interface DirectFsConvertResult {
  outputBytes: number;
  durationMs: number;
}

export async function directFsConvert({
  inputAbsolutePath,
  outputAbsolutePath,
  convertTo,
  outputFilter,
  filterOptions,
  timeoutMs,
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
    timeoutMs,
  });

  const outputStats = await stat(outputAbsolutePath);

  return {
    outputBytes: outputStats.size,
    durationMs: Date.now() - startedAt,
  };
}

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
