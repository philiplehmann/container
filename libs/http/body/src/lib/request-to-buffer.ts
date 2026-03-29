import type { Readable } from 'node:stream';
import { streamToBuffer } from '@riwi/stream';

export async function requestToBuffer(req: Readable): Promise<Buffer> {
  return streamToBuffer(req);
}
