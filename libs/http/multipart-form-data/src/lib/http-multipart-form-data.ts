import type { IncomingMessage } from 'node:http';
import { BadRequest } from '@container/http/error';
import { z } from 'zod';

const multipartFormData = z.object({
  'content-type': z.literal('multipart/form-data'),
});

export async function streamMultipartFormData(req: IncomingMessage) {
  const test = multipartFormData.safeParse(req.headers);
  if (test.success === false) {
    throw new BadRequest(JSON.stringify(test.error));
  }
}
