import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ReadStream } from 'node:fs';
import type { Readable } from 'node:stream';
import type { Prefix } from './route';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type NextResponse = {
  statusCode: number;
  body?: string | Buffer | ReadStream | Readable | object | undefined | null;
  contentType?: string;
};

export type Response = ServerResponse<IncomingMessage> & {
  req: IncomingMessage;
};

export interface ReqRes {
  req: IncomingMessage;
  res: Response;
}

export type NextMiddlware<Input extends Prefix<ReqRes>, Output extends Prefix<ReqRes>> = (
  data: Input,
) => Promise<Output>;

export type Next<Input extends Prefix<ReqRes>> = (
  data: Input,
) => Promise<void> | Promise<NextResponse> | NextResponse | void;

export type NextPromise<Input extends Prefix<ReqRes>> = (
  data: Input,
) => Promise<void> | Promise<NextResponse | undefined>;
