import { ReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import type { Next, ReqRes, Response } from './http-route';
import type { Prefix } from './route';

export const routeOutput = async <ParamKey extends string, Input extends Prefix<ParamKey, ReqRes>>(
  res: Response,
  output: Awaited<ReturnType<Next<ParamKey, Input>>> | ReturnType<Next<ParamKey, Input>>,
): Promise<Response | null> => {
  const data = output instanceof Promise ? await output : output;
  if (typeof data === 'object' && data !== null) {
    res.statusCode = data.statusCode;
    if (data.body instanceof ReadStream || data.body instanceof Readable) {
      res.setHeader('Content-Type', data.contentType ?? 'application/octet-stream');
      await finished(data.body.pipe(res, { end: false }));
      return res.end();
    }
    if (data.body instanceof Buffer || data.body instanceof Uint8Array) {
      res.setHeader('Content-Type', data.contentType ?? 'application/octet-stream');
      res.write(data.body);
      return res.end();
    }
    if (typeof data.body === 'string') {
      res.setHeader('Content-Type', data.contentType ?? 'text/plain');
      res.write(data.body);
      return res.end();
    }
    if (data.body) {
      res.setHeader('Content-Type', data.contentType ?? 'application/json');
      res.write(JSON.stringify(data.body));
      return res.end();
    }
  }
  return null;
};
