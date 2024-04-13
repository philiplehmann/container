import { type IncomingMessage, request, type RequestOptions } from 'node:http';
import { createReadStream } from 'node:fs';
import { readableToBuffer } from './readable-to-buffer';
import { Readable } from 'node:stream';

export const testRequest = async ({
  file,
  body,
  ...requestParams
}: RequestOptions & {
  file?: string;
  body?: string;
}): Promise<[IncomingMessage, string]> => {
  return new Promise((resolve, reject) => {
    const req = request({ host: 'localhost', pathname: '/', ...requestParams }, async (response) => {
      try {
        const text = (await readableToBuffer(response)).toString();
        resolve([response, text]);
      } catch (e) {
        reject(e);
      }
    });
    if (file) {
      createReadStream(file).pipe(req, { end: true });
    } else if (typeof body === 'string') {
      Readable.from(body).pipe(req, { end: true });
    } else {
      req.end();
    }
  });
};
