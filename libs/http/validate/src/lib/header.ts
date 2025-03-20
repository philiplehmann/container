import { BadRequest } from '@container/http/error';
import type { Next, ReqRes, Prefix } from '@container/http/route';
import type { ZodSchema, TypeOf } from 'zod';

export function validateHeader<RQ extends ReqRes, HeaderSchema extends ZodSchema>(
  schema: HeaderSchema,
): (params: RQ) => Promise<TypeOf<HeaderSchema>> {
  return async (params: RQ) => {
    const headers = await schema.safeParseAsync(params.req.headers);
    if (headers.success) {
      return headers.data;
    }
    console.error(headers.error);
    throw new BadRequest('Invalid headers');
  };
}

export function nextHeader<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  HeaderSchema extends ZodSchema,
>(schema: HeaderSchema, next: Next<ParamKey, Output & Record<'header', TypeOf<HeaderSchema>>>): Next<ParamKey, Input>;
export function nextHeader<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Prefix<ParamKey, ReqRes>,
  HeaderSchema extends ZodSchema,
  Key extends string = 'header',
>(
  schema: HeaderSchema,
  key: Key,
  next: Next<ParamKey, Output & Record<Key, TypeOf<HeaderSchema>>>,
): Next<ParamKey, Input>;
export function nextHeader<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  HeaderSchema extends ZodSchema,
>(...args: unknown[]): Next<ParamKey, Output> {
  const [schema, key, next] = (() => {
    if (args.length === 2) {
      return [args[0], 'header', args[1]] as [HeaderSchema, 'header', Next<ParamKey, Input>];
    }
    return args as [HeaderSchema, string, Next<ParamKey, Input>];
  })();

  return (async (params: Input) => {
    const validHeader = await validateHeader(schema)(params);
    return await next({ ...params, [key]: validHeader });
  }) as Next<ParamKey, Output>;
}

export const middlewareHeader =
  <
    ParamKey extends string,
    HeaderSchema extends ZodSchema,
    RQ extends Prefix<ParamKey, ReqRes>,
    Key extends string = 'header',
  >(
    schema: HeaderSchema,
    key?: Key,
  ) =>
  async (params: RQ): Promise<RQ & Record<Key, TypeOf<HeaderSchema>>> => {
    const validHeader = await validateHeader(schema)(params);
    return { ...params, [key ?? 'header']: validHeader } as RQ & Record<Key, TypeOf<HeaderSchema>>;
  };
