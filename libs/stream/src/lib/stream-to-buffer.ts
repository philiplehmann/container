import type { Readable } from 'node:stream';

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const bodyParts: Buffer[] = [];
  for await (const chunk of stream) {
    bodyParts.push(chunk);
  }
  return Buffer.concat(bodyParts);
}
