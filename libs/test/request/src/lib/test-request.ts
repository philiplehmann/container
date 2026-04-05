import type { ReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { type IncomingMessage, type OutgoingHttpHeaders, type RequestOptions, request } from 'node:http';
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
  const payload = (() => {
    if (file) {
      return readFile(file);
    }
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      return Promise.resolve(Buffer.from(body));
    }
    return Promise.resolve(null);
  })();

  const resolvedPayload = await payload;

  return new Promise((resolve, reject) => {
    const requestHeaders = requestParams.headers;
    const headers = (
      requestHeaders && !Array.isArray(requestHeaders) ? { ...requestHeaders } : {}
    ) as OutgoingHttpHeaders;

    if (resolvedPayload && headers['Content-Length'] == null && headers['content-length'] == null) {
      headers['Content-Length'] = String(resolvedPayload.length);
    }

    if (headers['Connection'] == null && headers['connection'] == null) {
      headers['Connection'] = 'close';
    }

    const req = request(
      { host: 'localhost', pathname: '/', agent: false, ...requestParams, headers },
      async (response) => {
        try {
          resolve(response);
        } catch (e) {
          reject(e);
        }
      },
    );

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(timeout, () => {
      req.destroy(new Error(`Request timed out after ${timeout}ms`));
    });

    if (resolvedPayload) {
      req.write(resolvedPayload);
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
