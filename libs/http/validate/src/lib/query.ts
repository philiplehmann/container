import { BadRequest } from '@container/http/error';
import type { Next, ReqRes, Prefix } from '@container/http/route';
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
    throw new BadRequest('Invalid query');
  };
}

export function nextQuery<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  QuerySchema extends ZodSchema,
>(schema: QuerySchema, next: Next<ParamKey, Output & Record<'query', TypeOf<QuerySchema>>>): Next<ParamKey, Input>;
export function nextQuery<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Prefix<ParamKey, ReqRes>,
  QuerySchema extends ZodSchema,
  Key extends string = 'query',
>(
  schema: QuerySchema,
  key: Key,
  next: Next<ParamKey, Output & Record<Key, TypeOf<QuerySchema>>>,
): Next<ParamKey, Input>;
export function nextQuery<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  QuerySchema extends ZodSchema,
>(...args: unknown[]): Next<ParamKey, Output> {
  const [schema, key, next] = (() => {
    if (args.length === 2) {
      return [args[0], 'query', args[1]] as [QuerySchema, 'query', Next<ParamKey, Input>];
    }
    return args as [QuerySchema, string, Next<ParamKey, Input>];
  })();

  return (async (params: Input) => {
    const validQuery = await validateQuery(schema)(params);
    return await next({ ...params, [key]: validQuery });
  }) as Next<ParamKey, Output>;
}

export const middlewareQuery =
  <
    ParamKey extends string,
    QuerySchema extends ZodSchema,
    RQ extends Prefix<ParamKey, ReqRes>,
    Key extends string = 'query',
  >(
    schema: QuerySchema,
    key?: Key,
  ) =>
  async (params: RQ): Promise<RQ & Record<Key, TypeOf<QuerySchema>>> => {
    const validQuery = await validateQuery(schema)(params);
    return { ...params, [key ?? 'query']: validQuery } as RQ & Record<Key, TypeOf<QuerySchema>>;
  };
