import type { Readable } from 'node:stream';
import { streamToString } from './stream-to-string';

export async function streamToJson<T = unknown>(req: Readable): Promise<T> {
  const body = await streamToString(req);
  return JSON.parse(body);
}
