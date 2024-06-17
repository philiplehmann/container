import type { Readable } from 'node:stream';

export async function streamLength(stream: Readable): Promise<number> {
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
  }
  return size;
}
