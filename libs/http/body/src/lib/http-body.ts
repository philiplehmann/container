import type { IncomingMessage } from 'node:http';
import { BadRequest } from '@container/http/error';
import { z } from 'zod';
import type { Readable } from 'node:stream';
import { streamToBuffer, streamToJson, streamToString } from '@container/stream';

const applicationJSON = z.object({
  'content-type': z.literal('application/json'),
});

export async function requestToBuffer(req: Readable): Promise<Buffer> {
  return streamToBuffer(req);
}

export async function requestToText(req: IncomingMessage): Promise<string> {
  return streamToString(req);
}

export async function requestToJson<T = unknown>(req: IncomingMessage): Promise<T> {
  const test = applicationJSON.safeParse(req.headers);
  if (test.success === false) {
    throw new BadRequest(JSON.stringify(test.error));
  }

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
