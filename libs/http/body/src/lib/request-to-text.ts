import type { IncomingMessage } from 'node:http';
import { streamToString } from '@container/stream';
import { z } from 'zod/v4';
import { validateRequestHeaders } from './validate-request-headers';

export const textPlain = z.object({
  'content-type': z.string().regex(/^text\/plain(?:;\s*charset=(?:utf-8|UTF-8))?$/),
});

export async function requestToText(req: IncomingMessage): Promise<string> {
  validateRequestHeaders(req, textPlain);

  return streamToString(req);
}
