import { z } from 'zod';
import { BadRequest } from '@container/http/error';
import { streamToJson } from '@container/stream';
import type { IncomingMessage } from 'node:http';
import { checkContentType } from './check-content-type';

export const applicationJSON = z.object({
  'content-type': z.string().startsWith('application/json'),
});

export async function requestToJson<T = unknown>(req: IncomingMessage): Promise<T> {
  checkContentType(req, applicationJSON);

  try {
    return await streamToJson(req);
  } catch (error) {
    if (error instanceof Error) {
      throw new BadRequest(error.message);
    }
    if (typeof error === 'string') {
      throw new BadRequest(error);
    }
    throw new BadRequest('Unknown error');
  }
}
