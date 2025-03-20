import { BadRequest } from '@container/http/error';
import type { Next, Prefix, ReqRes } from '@container/http/route';
import type { output, ZodType } from 'zod/v4';

export function validateQuery<RQ extends ReqRes, QuerySchema extends ZodType>(
  schema: QuerySchema,
): (params: RQ) => Promise<output<QuerySchema>> {
  return async (params: RQ) => {
    const url = new URL(params.req.url || '', `http://${params.req.headers.host}`);
    const data = Object.fromEntries(url.searchParams);
    const query = await schema.safeParseAsync(data);
    if (query.success) {
      return query.data;
    }
    console.error(query.error);
    throw new BadRequest('Invalid query');
  };
}

export function nextQuery<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  QuerySchema extends ZodType,
>(schema: QuerySchema, next: Next<ParamKey, Output & Record<'query', output<QuerySchema>>>): Next<ParamKey, Input>;
export function nextQuery<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Prefix<ParamKey, ReqRes>,
  QuerySchema extends ZodType,
  Key extends string = 'query',
>(
  schema: QuerySchema,
  key: Key,
  next: Next<ParamKey, Output & Record<Key, output<QuerySchema>>>,
): Next<ParamKey, Input>;
export function nextQuery<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  QuerySchema extends ZodType,
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
    QuerySchema extends ZodType,
    RQ extends Prefix<ParamKey, ReqRes>,
    Key extends string = 'query',
  >(
    schema: QuerySchema,
    key?: Key,
  ) =>
  async (params: RQ): Promise<RQ & Record<Key, output<QuerySchema>>> => {
    const validQuery = await validateQuery(schema)(params);
    return { ...params, [key ?? 'query']: validQuery } as RQ & Record<Key, output<QuerySchema>>;
  };
