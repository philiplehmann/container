import { HttpError } from '@container/http/error';
import { ReadStream } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import type { HttpMethod, Next, ReqRes, Response } from './http-route';
import { NoRoute } from './noRoute';
import { finished } from 'node:stream/promises';

export const routeOutput = async (
  res: Response,
  output: Awaited<ReturnType<Next<ReqRes>>> | ReturnType<Next<ReqRes>>,
): Promise<Response | null> => {
  const data = output instanceof Promise ? await output : output;
  if (typeof data === 'object' && data !== null) {
    res.statusCode = data.statusCode;
    if (data.body instanceof ReadStream || data.body instanceof Readable) {
      res.setHeader('Content-Type', data.contentType ?? 'application/octet-stream');
      await finished(data.body.pipe(res, { end: false }));
      return res.end();
    }
    if (data.body instanceof Buffer) {
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

const pathMatcher = (reqPath: string, path: (string | RegExp)[]): boolean => {
  let internalPath = reqPath.split('/').filter(Boolean);
  for (const part of path) {
    if (typeof part === 'string') {
      if (internalPath[0] !== part) {
        return false;
      }
      internalPath = internalPath.slice(1);
    } else {
      const match = internalPath[0].match(part);
      if (!match) {
        return false;
      }
      internalPath = internalPath.slice(1);
    }
  }
  return internalPath.length === 0;
};

export type RouteOutput = (
  req: IncomingMessage,
  res: Response,
  prefix?: (string | RegExp)[],
) => Promise<Response | null>;

export type Middleware<Input extends ReqRes, Output extends ReqRes> = (params: Input) => Promise<Output>;

export function route<MI1 extends ReqRes>(
  { method, path }: { method: HttpMethod; path: string | RegExp },
  ...functions: [Next<MI1>]
): RouteOutput;
export function route<MI1 extends ReqRes, MO1 extends ReqRes>(
  { method, path }: { method: HttpMethod; path: string | RegExp },
  ...functions: [Middleware<MI1, MO1>, Next<MO1>]
): RouteOutput;
export function route<MI1 extends ReqRes, MO1 extends ReqRes, MO2 extends ReqRes>(
  { method, path }: { method: HttpMethod; path: string | RegExp },
  ...functions: [Middleware<MI1, MO1>, Middleware<MO1, MO2>, Next<MO2>]
): RouteOutput;
export function route(
  { method, path }: { method: HttpMethod; path: string | RegExp },
  ...functions: unknown[]
): RouteOutput {
  return async (req, res, prefix = []) => {
    const prefixPath = [...prefix, ...(typeof path === 'string' ? path.split('/') : [path])].filter(Boolean);
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    if (req.method === method && pathMatcher(url.pathname, prefixPath)) {
      const middleware = functions.slice(0, -1) as unknown as Middleware<ReqRes, ReqRes>[];
      const next = functions.at(-1) as Next<ReqRes>;

      try {
        const params = await middleware.reduce(async (promise, middleware) => {
          const existingData = await promise;
          return middleware({ ...existingData, req, res });
        }, Promise.resolve({ req, res }));

        return await routeOutput(res, next(params));
      } catch (error) {
        if (error instanceof HttpError) {
          return routeOutput(res, { statusCode: error.status, body: error.message });
        }
        // not a known http error, so return a 500
        return routeOutput(res, {
          statusCode: 500,
          body: (() => {
            if (error instanceof Error) {
              return error.message;
            }
            if (typeof error === 'string') {
              return error;
            }
            return 'unknown error';
          })(),
        });
      }
    }
    throw new NoRoute('no route found');
  };
}
