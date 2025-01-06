import { z } from 'zod';
import { streamToString } from '@container/stream';
import type { IncomingMessage } from 'node:http';
import { checkContentType } from './check-content-type';

export const textPlain = z.object({
  'content-type': z.string().startsWith('text/plain').optional(),
});

export async function requestToText(req: IncomingMessage): Promise<string> {
  checkContentType(req, textPlain);

  return streamToString(req);
}
