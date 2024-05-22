import { HttpError } from '@container/http/error';
import type { HttpMethod, Next, ReqRes, Response } from './http-route';
import { NoRoute } from './noRoute';
import { pathMatcher } from './path-matcher';
import { routeOutput } from './route-output';

export type Prefix<RQ extends Prefix<ReqRes>> = RQ & { prefix?: (string | RegExp)[] };

export type RouteOutput<Input extends Prefix<ReqRes>> = (params: Input) => Promise<Response | null>;

export type Middleware<Input extends Prefix<ReqRes>, Output extends Prefix<ReqRes>> = (
  params: Input,
) => Promise<Output>;

export function route<MI1 extends Prefix<ReqRes>>(
  { method, path }: { method: HttpMethod; path: string | RegExp },
  ...functions: [Next<MI1>]
): RouteOutput<Prefix<MI1>>;
export function route<MI1 extends Prefix<ReqRes>, MO1 extends Prefix<ReqRes>>(
  { method, path }: { method: HttpMethod; path: string | RegExp },
  ...functions: [Middleware<MI1, MO1>, Next<MO1>]
): RouteOutput<Prefix<MO1>>;
export function route<MI1 extends Prefix<ReqRes>, MO1 extends Prefix<ReqRes>, MO2 extends Prefix<ReqRes>>(
  { method, path }: { method: HttpMethod; path: string | RegExp },
  ...functions: [Middleware<MI1, MO1>, Middleware<MO1, MO2>, Next<MO2>]
): RouteOutput<Prefix<MO2>>;
export function route(
  { method, path }: { method: HttpMethod; path: string | RegExp },
  ...functions: unknown[]
): RouteOutput<Prefix<ReqRes>> {
  return async ({ prefix = [], ...defaultParams }) => {
    const { req, res } = defaultParams;
    const prefixPath = [...prefix, ...(typeof path === 'string' ? path.split('/') : [path])].filter(Boolean);
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    if (req.method === method && pathMatcher(url.pathname, prefixPath)) {
      const middleware = functions.slice(0, -1) as unknown as Middleware<Prefix<ReqRes>, Prefix<ReqRes>>[];
      const next = functions.at(-1) as Next<Prefix<ReqRes>>;

      try {
        const params = await middleware.reduce(async (promise, middleware) => {
          const existingData = await promise;
          return middleware({ ...existingData });
        }, Promise.resolve(defaultParams));

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
