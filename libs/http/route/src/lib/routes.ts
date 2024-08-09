import { NoRoute } from './noRoute';
import type { IncomingMessage } from 'node:http';
import type { ReqRes, Response } from './http-route';
import type { Prefix, route, RouteOutput } from './route';

export type RoutesOutput<ParamKey extends string> = (
  req: IncomingMessage,
  res: Response,
  prefix?: RoutePathOptions<ParamKey>[],
) => Promise<void>;
export type RoutePathOptions<ParamKey extends string> =
  | { path: string; name?: undefined }
  | { path: RegExp; name: ParamKey };
// biome-ignore lint/complexity/noBannedTypes:
export type RoutePathOptionalOptions<ParamKey extends string> = RoutePathOptions<ParamKey> | {};
export type RoutePrefixOptions<ParamKey extends string> = { prefix?: RoutePathOptions<ParamKey>[] };
export type RoutesOptions<ParamKey extends string> = RoutePathOptions<ParamKey> & RoutePrefixOptions<ParamKey>;

export const pathOptionsToPathParts = <ParamKey extends string>(
  options: RoutePathOptionalOptions<ParamKey>,
): RoutePathOptions<ParamKey>[] => {
  const { path = '/', name = '' as ParamKey } = { path: undefined, name: null, ...options };
  return (
    typeof path === 'string'
      ? path.split('/').map((part) => ({ path: part }))
      : [{ path, name: name ?? ('' as ParamKey) }]
  ).filter(({ path }) => !!path);
};

export function connect<ParamKey extends string>(
  options: RoutePathOptions<ParamKey>,
  ...routes: ReturnType<typeof route>[]
): RoutesOutput<ParamKey>;
export function connect<ParamKey extends string>(...routes: ReturnType<typeof route>[]): RoutesOutput<ParamKey>;
export function connect<ParamKey extends string>(...outerArgs: unknown[]): RoutesOutput<ParamKey> {
  const { routes, options } = (() => {
    if (typeof outerArgs[0] === 'object') {
      return {
        routes: outerArgs.slice(1) as ReturnType<typeof route>[],
        options: outerArgs[0] as RoutePathOptionalOptions<ParamKey>,
      };
    }
    return { routes: outerArgs as ReturnType<typeof route>[], options: {} };
  })();

  const pathParts = pathOptionsToPathParts(options);

  return async (req, res, prefix = []) => {
    const prefixPath = [...prefix, ...pathParts];
    const all = await Promise.allSettled(routes.map((route) => route({ req, res, prefix: prefixPath, params: {} })));
    if (all.every((result) => result.status === 'rejected' && result.reason instanceof NoRoute)) {
      res.statusCode = 404;
      res.end();
    }
  };
}

export function routes<ParamKey extends string, RQ extends Prefix<ParamKey, ReqRes>>(
  options: RoutePathOptionalOptions<ParamKey>,
  ...routes: ReturnType<typeof route>[]
): RouteOutput<ParamKey, Prefix<ParamKey, RQ>>;
export function routes<ParamKey extends string, RQ extends Prefix<ParamKey, ReqRes>>(
  ...routes: ReturnType<typeof route>[]
): RouteOutput<ParamKey, Prefix<ParamKey, RQ>>;
export function routes<ParamKey extends string, RQ extends Prefix<ParamKey, ReqRes>>(
  ...outerArgs: unknown[]
): RouteOutput<ParamKey, Prefix<ParamKey, RQ>> {
  const { routes, options } = (() => {
    if (typeof outerArgs[0] === 'object') {
      return {
        routes: outerArgs.slice(1) as ReturnType<typeof route>[],
        options: outerArgs[0] as RoutesOptions<ParamKey>,
      };
    }
    return { routes: outerArgs as ReturnType<typeof route>[], options: {} };
  })();

  const pathParts = pathOptionsToPathParts(options);

  return async ({ prefix = [], ...params }) => {
    const prefixPath = [...prefix, ...pathParts];
    const all = await Promise.allSettled(routes.map((route) => route({ ...params, prefix: prefixPath })));
    if (all.every((result) => result.status === 'rejected' && result.reason instanceof NoRoute)) {
      throw new Error('no route found');
    }
    const first = all.find(
      (entry) => entry.status === 'fulfilled' && entry.value,
    ) as PromiseFulfilledResult<Response> | null;
    return first?.value ?? null;
  };
}
