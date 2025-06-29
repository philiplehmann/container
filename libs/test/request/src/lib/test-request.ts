import { createReadStream, type ReadStream } from 'node:fs';
import { type IncomingMessage, type RequestOptions, request } from 'node:http';
import { Readable } from 'node:stream';
import { streamToString } from '@container/stream';

export const streamRequest = async ({
  file,
  body,
  ...requestParams
}: RequestOptions & {
  file?: string;
  body?: string | Buffer | Readable | ReadStream;
}): Promise<IncomingMessage> => {
  return new Promise((resolve, reject) => {
    const req = request({ host: 'localhost', pathname: '/', ...requestParams }, async (response) => {
      try {
        resolve(response);
      } catch (e) {
        reject(e);
      }
    });
    if (file) {
      createReadStream(file).pipe(req, { end: true });
    } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
      req.write(body);
      req.end();
    } else if (body instanceof Readable) {
      body.pipe(req, { end: true });
    } else {
      req.end();
    }
  });
};

export const testRequest = async ({
  file,
  body,
  ...requestParams
}: RequestOptions & {
  file?: string;
  body?: string | Buffer | Readable | ReadStream;
}): Promise<[IncomingMessage, string]> => {
  const response = await streamRequest({ file, body, ...requestParams });
  const text = await streamToString(response);
  return [response, text];
};
