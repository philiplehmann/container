import { BadRequest } from '@container/http/error';
import type { IncomingMessage } from 'node:http';

export function getBoundary(req: IncomingMessage): string {
  const boundary = req.headers['content-type']
    ?.split('; ')
    .find((v) => v.startsWith('boundary='))
    ?.split('boundary=')?.[1];
  if (boundary === undefined) {
    throw new BadRequest('Missing boundary');
  }
  return boundary;
}
