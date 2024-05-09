import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError } from '@container/http/error';
import type { TypeOf, ZodSchema } from 'zod';
import { validate, validateSearchParams } from '@container/http/validate';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type Response = ServerResponse<IncomingMessage> & {
  req: IncomingMessage;
};
type Next<
  BodySchema extends ZodSchema | undefined = undefined,
  QuerySchema extends ZodSchema | undefined = undefined,
> = (
  req: IncomingMessage,
  res: Response,
  data: {
    body: BodySchema extends ZodSchema ? TypeOf<BodySchema> : undefined;
    query: QuerySchema extends ZodSchema ? TypeOf<QuerySchema> : undefined;
  },
) => Promise<void> | void;

export const route =
  <BodySchema extends ZodSchema | undefined = undefined, QuerySchema extends ZodSchema | undefined = undefined>(
    { method, path, body, query }: { method: HttpMethod; path: string; body?: BodySchema; query?: QuerySchema },
    next: Next<BodySchema, QuerySchema>,
  ) =>
  async (req: IncomingMessage, res: Response) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    if (req.method === method && url.pathname === path) {
      try {
        const validSearchParams = (
          query ? await validateSearchParams(query)(req, res) : undefined
        ) as QuerySchema extends ZodSchema ? TypeOf<QuerySchema> : undefined;
        const validBody = (body ? await validate(body)(req, res) : undefined) as BodySchema extends ZodSchema
          ? TypeOf<BodySchema>
          : undefined;
        return await next(req, res, { body: validBody, query: validSearchParams });
      } catch (error) {
        if (error instanceof HttpError) {
          res.statusCode = error.status;
          res.write(error.message);
          return res.end();
        }
        // not a known http error, so return a 500
        res.statusCode = 500;
        if (error instanceof Error) {
          res.write(error.message);
        } else if (typeof error === 'string') {
          res.write(error);
        } else {
          res.write('unknown error');
        }
        return res.end();
      }
    }
    throw new Error('no route found');
  };

export const get = <QuerySchema extends ZodSchema | undefined = undefined>(
  params:
    | {
        path: string;
        query?: QuerySchema;
      }
    | string,
  next: Next<undefined, QuerySchema>,
) => {
  if (typeof params === 'string') {
    return route({ method: 'GET', path: params }, next);
  }
  return route({ method: 'GET', ...params }, next);
};

export const post = <
  BodySchema extends ZodSchema | undefined = undefined,
  QuerySchema extends ZodSchema | undefined = undefined,
>(
  params:
    | {
        path: string;
        body?: BodySchema;
        query?: QuerySchema;
      }
    | string,
  next: Next<BodySchema, QuerySchema>,
) => {
  if (typeof params === 'string') {
    return route({ method: 'POST', path: params }, next);
  }
  return route({ method: 'POST', ...params }, next);
};

export const put = <
  BodySchema extends ZodSchema | undefined = undefined,
  QuerySchema extends ZodSchema | undefined = undefined,
>(
  params:
    | {
        path: string;
        body?: BodySchema;
        query?: QuerySchema;
      }
    | string,
  next: Next<BodySchema, QuerySchema>,
) => {
  if (typeof params === 'string') {
    return route({ method: 'PUT', path: params }, next);
  }
  return route({ method: 'PUT', ...params }, next);
};

export const patch = <
  BodySchema extends ZodSchema | undefined = undefined,
  QuerySchema extends ZodSchema | undefined = undefined,
>(
  params:
    | {
        path: string;
        body?: BodySchema;
        query?: QuerySchema;
      }
    | string,
  next: Next<BodySchema, QuerySchema>,
) => {
  if (typeof params === 'string') {
    return route({ method: 'PATCH', path: params }, next);
  }
  return route({ method: 'PATCH', ...params }, next);
};

export const del = <QuerySchema extends ZodSchema | undefined = undefined>(
  params:
    | {
        path: string;
        query?: QuerySchema;
      }
    | string,
  next: Next<undefined, QuerySchema>,
) => {
  if (typeof params === 'string') {
    return route({ method: 'DELETE', path: params }, next);
  }
  return route({ method: 'DELETE', ...params }, next);
};

export const routes =
  (...routes: ReturnType<typeof route>[]) =>
  async (req: IncomingMessage, res: Response) => {
    const all = await Promise.allSettled(routes.map((route) => route(req, res)));
    if (!all.find((result) => result.status === 'fulfilled')) {
      res.statusCode = 404;
      res.end();
    }
  };
