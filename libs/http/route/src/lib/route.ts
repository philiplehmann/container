import { HttpError } from '@container/http/error';
import type { HttpMethod, Next, ReqRes, Response } from './http-route';
import { NoRoute } from './noRoute';
import { pathMatcher } from './path-matcher';
import { routeOutput } from './route-output';
import { pathOptionsToPathParts, type RoutePathOptions, type RoutePrefixOptions } from './routes';

export type RouteParams = { params: Record<string, string> };
export type Prefix<ParamKey extends string, RQ extends ReqRes> = RQ & RoutePrefixOptions<ParamKey> & RouteParams;

export type RouteOutput<ParamKey extends string, Input extends Prefix<ParamKey, ReqRes>> = (
  params: Input,
) => Promise<Response | null>;

export type Middleware<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Prefix<ParamKey, ReqRes>,
> = (params: Input) => Promise<Output>;

export type RouteOptions<ParamKey extends string> = { method: HttpMethod } & RoutePathOptions<ParamKey>;

export function route<ParamKey extends string, MI1 extends Prefix<ParamKey, ReqRes>>(
  { method, path, name }: RouteOptions<ParamKey>,
  ...functions: [Next<MI1>]
): RouteOutput<ParamKey, Prefix<ParamKey, MI1>>;
export function route<
  ParamKey extends string,
  MI1 extends Prefix<ParamKey, ReqRes>,
  MO1 extends Prefix<ParamKey, ReqRes>,
>(
  { method, path, name }: RouteOptions<ParamKey>,
  ...functions: [Middleware<ParamKey, MI1, MO1>, Next<MO1>]
): RouteOutput<ParamKey, Prefix<ParamKey, MO1>>;
export function route<
  ParamKey extends string,
  MI1 extends Prefix<ParamKey, ReqRes>,
  MO1 extends Prefix<ParamKey, ReqRes>,
  MO2 extends Prefix<ParamKey, ReqRes>,
>(
  { method, path, name }: RouteOptions<ParamKey>,
  ...functions: [Middleware<ParamKey, MI1, MO1>, Middleware<ParamKey, MO1, MO2>, Next<MO2>]
): RouteOutput<ParamKey, Prefix<ParamKey, MO2>>;
export function route<ParamKey extends string>(
  { method, path, name }: RouteOptions<ParamKey>,
  ...functions: unknown[]
): RouteOutput<ParamKey, Prefix<ParamKey, ReqRes>> {
  return async ({ prefix = [], ...defaultParams }) => {
    const { req, res } = defaultParams;
    const prefixPath = [...prefix, ...pathOptionsToPathParts({ path, name })];
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    if (req.method === method) {
      const urlParams = pathMatcher(url.pathname, prefixPath);
      if (urlParams !== null) {
        const middleware = functions.slice(0, -1) as unknown as Middleware<
          ParamKey,
          Prefix<ParamKey, ReqRes>,
          Prefix<ParamKey, ReqRes>
        >[];
        const next = functions.at(-1) as Next<Prefix<ParamKey, ReqRes>>;

        try {
          const params = await middleware.reduce(
            async (promise, middleware) => {
              const existingData = await promise;
              return middleware({ ...existingData });
            },
            Promise.resolve({ ...defaultParams, params: urlParams }),
          );

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
    }
    throw new NoRoute('no route found');
  };
}
