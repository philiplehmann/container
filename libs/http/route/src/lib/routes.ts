import { NoRoute } from './noRoute';
import type { IncomingMessage } from 'node:http';
import type { ReqRes, Response } from './http-route';
import type { Prefix, route, RouteOutput } from './route';

export type RoutesOutput = (req: IncomingMessage, res: Response, prefix?: (string | RegExp)[]) => Promise<void>;

export function connect(options: { path?: string | RegExp }, ...routes: ReturnType<typeof route>[]): RoutesOutput;
export function connect(...routes: ReturnType<typeof route>[]): RoutesOutput;
export function connect(...outerArgs: unknown[]): RoutesOutput {
  const { routes, options } = (() => {
    if (typeof outerArgs[0] === 'object') {
      return {
        routes: outerArgs.slice(1) as ReturnType<typeof route>[],
        options: outerArgs[0] as { prefix?: string | RegExp[]; path?: string | RegExp },
      };
    }
    return { routes: outerArgs as ReturnType<typeof route>[], options: {} };
  })();
  const { path = '/' } = options;
  const pathParts = (typeof path === 'string' ? path.split('/') : [path]).filter(Boolean);

  return async (req, res, prefix = []) => {
    const prefixPath = [...prefix, ...pathParts];
    const all = await Promise.allSettled(routes.map((route) => route({ req, res, prefix: prefixPath })));
    if (all.every((result) => result.status === 'rejected' && result.reason instanceof NoRoute)) {
      res.statusCode = 404;
      res.end();
    }
  };
}

export function routes<RQ extends Prefix<ReqRes>>(
  options: { path?: string | RegExp },
  ...routes: ReturnType<typeof route>[]
): RouteOutput<Prefix<RQ>>;
export function routes<RQ extends Prefix<ReqRes>>(...routes: ReturnType<typeof route>[]): RouteOutput<Prefix<RQ>>;
export function routes<RQ extends Prefix<ReqRes>>(...outerArgs: unknown[]): RouteOutput<Prefix<RQ>> {
  const { routes, options } = (() => {
    if (typeof outerArgs[0] === 'object') {
      return {
        routes: outerArgs.slice(1) as ReturnType<typeof route>[],
        options: outerArgs[0] as { prefix?: string | RegExp[]; path?: string | RegExp },
      };
    }
    return { routes: outerArgs as ReturnType<typeof route>[], options: {} };
  })();
  const { path = '/' } = options;
  const pathParts = (typeof path === 'string' ? path.split('/') : [path]).filter(Boolean);

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
