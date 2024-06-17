import type { Readable } from 'node:stream';
import { streamToBuffer } from './stream-to-buffer';

export async function streamToString(req: Readable): Promise<string> {
  const buffer = await streamToBuffer(req);
  return buffer.toString('utf-8');
}
