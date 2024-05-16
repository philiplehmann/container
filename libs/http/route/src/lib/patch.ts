import type { Next, ReqRes } from './http-route';
import { type Middleware, route, type RouteOutput } from './route';

export function patch<MI1 extends ReqRes>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Next<MI1>]
): RouteOutput;
export function patch<MI1 extends ReqRes, MO1 extends ReqRes>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Middleware<MI1, MO1>, Next<MO1>]
): RouteOutput;
export function patch<MI1 extends ReqRes, MO1 extends ReqRes, MO2 extends ReqRes>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Middleware<MI1, MO1>, Middleware<MO1, MO2>, Next<MO2>]
): RouteOutput;
export function patch(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: unknown[]
): RouteOutput {
  if (typeof params === 'string') {
    // @ts-expect-error
    return route({ method: 'PATCH', path: params }, ...middleware);
  }
  // @ts-expect-error
  return route({ ...params, method: 'PATCH' }, ...middleware);
}
