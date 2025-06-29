import type { IncomingMessage } from 'node:http';
import { BadRequest } from '@container/http/error';
import type { ZodType } from 'zod';

export const validateRequestHeaders = (req: IncomingMessage, type: ZodType): void => {
  const test = type.safeParse(req.headers);
  if (test.success === false) {
    throw new BadRequest('Invalid request headers');
  }
};
