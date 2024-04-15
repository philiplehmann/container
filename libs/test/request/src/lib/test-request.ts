import { type IncomingMessage, request, type RequestOptions } from 'node:http';
import { createReadStream } from 'node:fs';
import { readableToBuffer } from './readable-to-buffer';

export const testRequest = async ({
  file,
  ...requestParams
}: RequestOptions & {
  file?: string;
}): Promise<[IncomingMessage, string]> => {
  return new Promise((resolve, reject) => {
    const req = request(requestParams, async (response) => {
      try {
        const text = (await readableToBuffer(response)).toString();
        resolve([response, text]);
      } catch (e) {
        reject(e);
      }
    });
    if (file) {
      createReadStream(file).pipe(req, { end: true });
    } else {
      req.end();
    }
  });
};
