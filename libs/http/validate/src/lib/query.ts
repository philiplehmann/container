import { BadRequest } from '@container/http/error';
import type { Next, NextPromise, ReqRes } from '@container/http/route';
import type { ZodSchema, TypeOf } from 'zod';

export function validateQuery<RQ extends ReqRes, QuerySchema extends ZodSchema>(
  schema: QuerySchema,
): (params: RQ) => Promise<TypeOf<QuerySchema>> {
  return async (params: RQ) => {
    const url = new URL(params.req.url || '', `http://${params.req.headers.host}`);
    const data = Object.fromEntries(url.searchParams);
    const query = await schema.safeParseAsync(data);
    if (query.success) {
      return query.data;
    }
    throw new BadRequest(JSON.stringify(query.error));
  };
}

export function nextQuery<Input extends ReqRes, Output extends Input, QuerySchema extends ZodSchema>(
  schema: QuerySchema,
  next: Next<Output & Record<'query', TypeOf<QuerySchema>>>,
): Next<Input>;
export function nextQuery<
  Input extends ReqRes,
  Output extends Input,
  QuerySchema extends ZodSchema,
  Key extends string = 'query',
>(schema: QuerySchema, key: Key, next: Next<Output & Record<Key, TypeOf<QuerySchema>>>): Next<Input>;
export function nextQuery<Input extends ReqRes, Output extends Input, QuerySchema extends ZodSchema>(
  ...args: unknown[]
): Next<Input> {
  const [schema, key, next] = (() => {
    if (args.length === 2) {
      return [args[0], 'query', args[1]] as [QuerySchema, 'query', Next<Input>];
    }
    return args as [QuerySchema, string, Next<Input>];
  })();

  return (async (params: Input) => {
    const validQuery = await validateQuery(schema)(params);
    return await next({ ...params, [key]: validQuery });
  }) as Next<Input>;
}

export const middlewareQuery =
  <QuerySchema extends ZodSchema, RQ extends ReqRes, Key extends string = 'query'>(schema: QuerySchema, key?: Key) =>
  async (params: RQ): Promise<RQ & Record<Key, TypeOf<QuerySchema>>> => {
    const validQuery = await validateQuery(schema)(params);
    return { ...params, [key ?? 'query']: validQuery } as RQ & Record<Key, TypeOf<QuerySchema>>;
  };
