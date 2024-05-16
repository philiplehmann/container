import { NoRoute } from './noRoute';

import type { IncomingMessage } from 'node:http';
import type { Response } from './http-route';
import type { route } from './route';

export function routes(
  options: { path?: string | RegExp },
  ...routes: ReturnType<typeof route>[]
): (req: IncomingMessage, res: Response, prefix?: (string | RegExp)[]) => Promise<void>;
export function routes(
  ...routes: ReturnType<typeof route>[]
): (req: IncomingMessage, res: Response, prefix?: (string | RegExp)[]) => Promise<void>;
export function routes(
  ...args: unknown[]
): (req: IncomingMessage, res: Response, prefix?: (string | RegExp)[]) => Promise<void> {
  const { routes, options } = (() => {
    if (typeof args[0] === 'function') {
      return { routes: args as ReturnType<typeof route>[], options: {} };
    }
    return {
      routes: args.slice(1) as ReturnType<typeof route>[],
      options: args[0] as { prefix?: string | RegExp[]; path?: string | RegExp },
    };
  })();
  const { path = '/' } = options;
  const pathParts = (typeof path === 'string' ? path.split('/') : [path]).filter(Boolean);

  return async (req, res, prefix = []) => {
    const prefixPath = [...prefix, ...pathParts];
    const all = await Promise.allSettled(routes.map((route) => route(req, res, prefixPath)));
    if (all.every((result) => result.status === 'rejected' && result.reason instanceof NoRoute)) {
      res.statusCode = 404;
      res.end();
    }
  };
}
