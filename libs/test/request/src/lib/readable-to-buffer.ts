import { Readable } from 'node:stream';

export const readableToBuffer = async (readable: Readable): Promise<Buffer> => {
  const buffers: Uint8Array[] = [];
  for await (const data of readable) {
    buffers.push(data);
  }
  return Buffer.concat(buffers);
};
