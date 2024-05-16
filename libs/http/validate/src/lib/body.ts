import { requestToJson } from '@container/http/body';
import { BadRequest } from '@container/http/error';
import type { Next, ReqRes } from '@container/http/route';
import type { ZodSchema, TypeOf } from 'zod';

export function validateBody<RQ extends ReqRes, BodySchema extends ZodSchema>(
  schema: BodySchema,
): (params: RQ) => Promise<TypeOf<BodySchema>> {
  return async (params: RQ) => {
    const data = await requestToJson(params.req);
    const body = await schema.safeParseAsync(data);
    if (body.success) {
      return body.data;
    }
    throw new BadRequest(JSON.stringify(body.error));
  };
}

export function nextBody<Input extends ReqRes, Output extends Input, BodySchema extends ZodSchema>(
  schema: BodySchema,
  next: Next<Output & Record<'body', TypeOf<BodySchema>>>,
): Next<Input>;
export function nextBody<
  Input extends ReqRes,
  Output extends Input,
  BodySchema extends ZodSchema,
  Key extends string = 'body',
>(schema: BodySchema, key: Key, next: Next<Output & Record<Key, TypeOf<BodySchema>>>): Next<Input>;
export function nextBody<Input extends ReqRes, Output extends Input, BodySchema extends ZodSchema>(
  ...args: unknown[]
): Next<Input> {
  const [schema, key, next] = (() => {
    if (args.length === 2) {
      return [args[0], 'body', args[1]] as [BodySchema, 'body', Next<Input>];
    }
    return args as [BodySchema, string, Next<Input>];
  })();

  return (async (params: Input) => {
    const validBody = await validateBody(schema)(params);
    return await next({ ...params, [key]: validBody });
  }) as Next<Input>;
}

export const middlewareBody =
  <BodySchema extends ZodSchema, RQ extends ReqRes, Key extends string = 'body'>(schema: BodySchema, key?: Key) =>
  async (params: RQ): Promise<RQ & Record<Key, TypeOf<BodySchema>>> => {
    const validBody = await validateBody(schema)(params);
    return { ...params, [key ?? 'body']: validBody } as RQ & Record<Key, TypeOf<BodySchema>>;
  };
