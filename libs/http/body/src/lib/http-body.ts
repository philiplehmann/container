import type { IncomingMessage } from 'node:http';
import { BadRequest } from '@container/http/error';
import { z } from 'zod';
import type { Readable } from 'node:stream';
import type { ReadStream } from 'node:fs';

const applicationJSON = z.object({
  'content-type': z.literal('application/json'),
});

export async function streamToBuffer(stream: Readable | ReadStream): Promise<Buffer>{
  const bodyParts: Buffer[] = [];
  for await (const chunk of stream) {
    bodyParts.push(chunk);
  }
  return Buffer.concat(bodyParts);
}

export async function requestToBuffer(req: IncomingMessage): Promise<Buffer> {
  return streamToBuffer(req);
};

export async function streamToText(req: Readable | ReadStream): Promise<string> {
  const buffer = await streamToBuffer(req);
  return buffer.toString('utf-8');
};

export async function requestToText(req: IncomingMessage): Promise<string> {
  return streamToText(req);
};

export async function streamToJson<T = unknown>(req: Readable | ReadStream): Promise<T> {
  try {
    const body = await streamToText(req);
    return JSON.parse(body);
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

export async function requestToJson<T = unknown>(req: IncomingMessage): Promise<T> {
  const test = applicationJSON.safeParse(req.headers);
  if (test.success === false) {
    throw new BadRequest(JSON.stringify(test.error));
  }

  return streamToJson(req);
};
