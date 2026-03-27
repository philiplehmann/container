import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { BadRequest } from '@container/http/error';

export async function assertReadableInputFile(inputAbsolutePath: string): Promise<void> {
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
