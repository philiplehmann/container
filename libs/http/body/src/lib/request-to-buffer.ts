import { streamToBuffer } from '@container/stream';
import type { Readable } from 'node:stream';

export async function requestToBuffer(req: Readable): Promise<Buffer> {
  return streamToBuffer(req);
}
