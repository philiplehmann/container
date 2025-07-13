import type { IncomingMessage } from 'node:http';
import { BadRequest } from '@container/http/error';
import type { ZodObject } from 'zod/v4';

export const validateRequestHeaders = (req: IncomingMessage, type: ZodObject): void => {
  const test = type.safeParse(req.headers);
  if (test.success === false) {
    throw new BadRequest('Invalid request headers');
  }
};
