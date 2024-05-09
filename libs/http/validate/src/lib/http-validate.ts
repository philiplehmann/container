import { requestToJson } from '@container/http/body';
import { BadRequest } from '@container/http/error';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ZodSchema, TypeOf } from 'zod';

export type Response = ServerResponse<IncomingMessage> & {
  req: IncomingMessage;
};
type Next<S extends ZodSchema> = (req: IncomingMessage, res: Response, body: TypeOf<S>) => Promise<void> | void;

export function validate<S extends ZodSchema>(schema: S): (req: IncomingMessage, res: Response) => Promise<TypeOf<S>>;
export function validate<S extends ZodSchema>(
  schema: S,
  next: Next<S>,
): (req: IncomingMessage, res: Response) => Promise<void>;
export function validate<S extends ZodSchema>(schema: S, next?: Next<S>) {
  return async (req: IncomingMessage, res: Response) => {
    const data = await requestToJson(req);
    const body = schema.safeParse(data);
    if (body.success) {
      return next ? next(req, res, body.data) : body.data;
    }
    throw new BadRequest(JSON.stringify(body.error));
  };
}

export function validateSearchParams<S extends ZodSchema>(
  schema: S,
): (req: IncomingMessage, res: Response) => Promise<TypeOf<S>>;
export function validateSearchParams<S extends ZodSchema>(
  schema: S,
  next: Next<S>,
): (req: IncomingMessage, res: Response) => Promise<void>;
export function validateSearchParams<S extends ZodSchema>(schema: S, next?: Next<S>) {
  return async (req: IncomingMessage, res: Response) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const params = Object.fromEntries(url.searchParams);
    const validated = schema.safeParse(params);
    if (validated.success) {
      return next ? next(req, res, params) : params;
    }
    throw new BadRequest(JSON.stringify(params));
  };
}
