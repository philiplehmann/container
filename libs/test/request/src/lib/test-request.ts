import { createReadStream, type ReadStream } from 'node:fs';
import { type IncomingMessage, type RequestOptions, request } from 'node:http';
import { Readable } from 'node:stream';
import { streamToString } from '@riwi/stream';

export const streamRequest = async ({
  file,
  body,
  timeout = 30_000,
  ...requestParams
}: RequestOptions & {
  file?: string;
  body?: string | Buffer | Readable | ReadStream;
  timeout?: number;
}): Promise<IncomingMessage> => {
  return new Promise((resolve, reject) => {
    const req = request({ host: 'localhost', pathname: '/', ...requestParams }, async (response) => {
      try {
        resolve(response);
      } catch (e) {
        reject(e);
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(timeout, () => {
      req.destroy(new Error(`Request timed out after ${timeout}ms`));
    });

    if (file) {
      const stream = createReadStream(file);
      stream.on('error', (error) => {
        req.destroy(error);
      });
      stream.pipe(req, { end: true });
    } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
      req.write(body);
      req.end();
    } else if (body instanceof Readable) {
      body.on('error', (error: Error) => {
        req.destroy(error);
      });
      body.pipe(req, { end: true });
    } else {
      req.end();
    }
  });
};

export const testRequest = async ({
  file,
  body,
  timeout,
  ...requestParams
}: RequestOptions & {
  file?: string;
  body?: string | Buffer | Readable | ReadStream;
  timeout?: number;
}): Promise<[IncomingMessage, string]> => {
  const response = await streamRequest({ file, body, timeout, ...requestParams });
  const text = await streamToString(response);
  return [response, text];
};
