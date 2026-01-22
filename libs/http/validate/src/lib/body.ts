import { requestToJson } from '@container/http/body';
import { BadRequest } from '@container/http/error';
import type { Next, Prefix, ReqRes } from '@container/http/route';
import type { output, ZodType } from 'zod/v4';

export function validateBody<RQ extends ReqRes, BodySchema extends ZodType>(
  schema: BodySchema,
): (params: RQ) => Promise<output<BodySchema>> {
  return async (params: RQ) => {
    const data = await requestToJson(params.req);
    const body = await schema.safeParseAsync(data);
    if (body.success) {
      return body.data;
    }
    console.error(body.error);
    throw new BadRequest('Invalid body');
  };
}

export function nextBody<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  BodySchema extends ZodType,
>(schema: BodySchema, next: Next<ParamKey, Output & Record<'body', output<BodySchema>>>): Next<ParamKey, Input>;
export function nextBody<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  BodySchema extends ZodType,
  Key extends string = 'body',
>(schema: BodySchema, key: Key, next: Next<ParamKey, Output & Record<Key, output<BodySchema>>>): Next<ParamKey, Input>;
export function nextBody<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Input,
  BodySchema extends ZodType,
>(...args: unknown[]): Next<ParamKey, Output> {
  const [schema, key, next] = (() => {
    if (args.length === 2) {
      return [args[0], 'body', args[1]] as [BodySchema, 'body', Next<ParamKey, Input>];
    }
    return args as [BodySchema, string, Next<ParamKey, Input>];
  })();

  return (async (params: Input) => {
    const validBody = await validateBody(schema)(params);
    return await next({ ...params, [key]: validBody });
  }) as Next<ParamKey, Input>;
}

export const middlewareBody =
  <
    BodySchema extends ZodType,
    ParamKey extends string,
    RQ extends Prefix<ParamKey, ReqRes>,
    Key extends string = 'body',
  >(
    schema: BodySchema,
    key?: Key,
  ) =>
  async (params: RQ): Promise<RQ & Record<Key, output<BodySchema>>> => {
    const validBody = await validateBody(schema)(params);
    return { ...params, [key ?? 'body']: validBody } as RQ & Record<Key, output<BodySchema>>;
  };
