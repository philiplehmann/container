import type { Next, ReqRes } from '../http-route';
import { type Middleware, type Prefix, route, type RouteOutput } from '../route';

export function patch<MI1 extends Prefix<ReqRes>>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Next<MI1>]
): RouteOutput<MI1>;
export function patch<MI1 extends Prefix<ReqRes>, MO1 extends Prefix<ReqRes>>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Middleware<MI1, MO1>, Next<MO1>]
): RouteOutput<MI1>;
export function patch<MI1 extends Prefix<ReqRes>, MO1 extends Prefix<ReqRes>, MO2 extends Prefix<ReqRes>>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Middleware<MI1, MO1>, Middleware<MO1, MO2>, Next<MO2>]
): RouteOutput<MI1>;
export function patch<MI1 extends Prefix<ReqRes>>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: unknown[]
): RouteOutput<MI1> {
  if (typeof params === 'string') {
    // @ts-expect-error
    return route({ method: 'PATCH', path: params }, ...middleware);
  }
  // @ts-expect-error
  return route({ ...params, method: 'PATCH' }, ...middleware);
}
