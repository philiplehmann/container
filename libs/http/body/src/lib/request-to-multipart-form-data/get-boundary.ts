import { BadRequest } from '@container/http/error';
import type { IncomingMessage } from 'node:http';

export function getBoundary(req: IncomingMessage): string {
  const contentType = req.headers['content-type'];
  if (!contentType) {
    throw new BadRequest('Missing Content-Type header');
  }

  const boundary = contentType
    .split('; ')
    .find((v) => v.startsWith('boundary='))
    ?.split('boundary=')?.[1];

  if (boundary === undefined) {
    throw new BadRequest('Missing boundary');
  }

  // RFC 2046 states boundary can't be longer than 70 characters
  if (boundary.length > 70) {
    throw new BadRequest('Invalid boundary length');
  }

  return boundary;
}
