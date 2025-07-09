import { ReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import type { Next, ReqRes, Response } from './http-route';
import type { Prefix } from './route';

export const routeOutput = async <ParamKey extends string, Input extends Prefix<ParamKey, ReqRes>>(
  res: Response,
  output: Awaited<ReturnType<Next<ParamKey, Input>>> | ReturnType<Next<ParamKey, Input>>,
): Promise<Response | null> => {
  if (res.ended) {
    console.warn('Response already ended, skipping output.');
    return null;
  }
  const data = output instanceof Promise ? await output : output;

  const writeAsync = (content: string | Buffer | Uint8Array): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      res.write(content, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  if (typeof data === 'object' && data !== null) {
    res.statusCode = data.statusCode;
    if (data.body instanceof ReadStream || data.body instanceof Readable) {
      res.setHeader('Content-Type', data.contentType ?? 'application/octet-stream');
      await finished(data.body.pipe(res, { end: true }));
      res.ended = true;
      return res;
    }
    if (data.body instanceof Buffer || data.body instanceof Uint8Array) {
      res.setHeader('Content-Type', data.contentType ?? 'application/octet-stream');
      await writeAsync(data.body);
      res.end();
      res.ended = true;
      return res;
    }
    if (typeof data.body === 'string') {
      res.setHeader('Content-Type', data.contentType ?? 'text/plain');
      await writeAsync(data.body);
      res.end();
      res.ended = true;
      return res;
    }
    if (data.body) {
      res.setHeader('Content-Type', data.contentType ?? 'application/json');
      await writeAsync(JSON.stringify(data.body));
      res.end();
      res.ended = true;
      return res;
    }
  }
  return null;
};
