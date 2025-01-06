import { BadRequest } from '@container/http/error';
import type { IncomingMessage } from 'node:http';
import type { ZodType } from 'zod';

export const checkContentType = (req: IncomingMessage, type: ZodType): void => {
  const test = type.safeParse(req.headers);
  if (test.success === false) {
    throw new BadRequest(JSON.stringify(test.error));
  }
};
