import { z } from 'zod';
import { BadRequest } from '@container/http/error';
import { streamToJson } from '@container/stream';
import type { IncomingMessage } from 'node:http';
import { validateRequestHeaders } from './validate-request-headers';

export const applicationJSON = z.object({
  'content-type': z.string().regex(/^application\/json(?:;\s*charset=utf-8)?$/i),
});

export async function requestToJson<T = unknown>(req: IncomingMessage): Promise<T> {
  validateRequestHeaders(req, applicationJSON);

  try {
    return await streamToJson(req);
  } catch (error) {
    if (error instanceof Error) {
      throw new BadRequest('Invalid JSON format');
    }
    if (typeof error === 'string') {
      throw new BadRequest('Invalid JSON format');
    }
    throw new BadRequest('Error processing JSON request');
  }
}
