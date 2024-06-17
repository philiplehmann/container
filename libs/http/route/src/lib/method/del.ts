import type { Next, ReqRes } from '../http-route';
import { type Middleware, type Prefix, route, type RouteOutput } from '../route';

export function del<ParamKey extends string, MI1 extends Prefix<ReqRes>>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Next<MI1>]
): RouteOutput<MI1>;
export function del<ParamKey extends string, MI1 extends Prefix<ReqRes>, MO1 extends Prefix<ReqRes>>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Middleware<ParamKey, MI1, MO1>, Next<MO1>]
): RouteOutput<ParamKey, MI1>;
export function del<
  ParamKey extends string,
  MI1 extends Prefix<ParamKey, ReqRes>,
  MO1 extends Prefix<ParamKey, ReqRes>,
  MO2 extends Prefix<ParamKey, ReqRes>,
>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: [Middleware<ParamKey, MI1, MO1>, Middleware<ParamKey, MO1, MO2>, Next<MO2>]
): RouteOutput<ParamKey, MI1>;
export function del<ParamKey extends string, MI1 extends Prefix<ParamKey, ReqRes>>(
  params:
    | {
        path: string;
      }
    | string,
  ...middleware: unknown[]
): RouteOutput<ParamKey, MI1> {
  if (typeof params === 'string') {
    // @ts-expect-error
    return route({ method: 'DELETE', path: params }, ...middleware);
  }
  // @ts-expect-error
  return route({ ...params, method: 'DELETE' }, ...middleware);
}
