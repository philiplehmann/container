import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ReadStream } from 'node:fs';
import type { Readable } from 'node:stream';
import type { Prefix } from './route';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type NextResponse = {
  statusCode: number;
  body?:
    | string
    | Buffer
    | ReadStream
    | Readable
    | Uint8Array
    | Array<unknown>
    | Record<string, unknown>
    | undefined
    | null;
  contentType?: string;
};

export type Response = ServerResponse<IncomingMessage> & {
  req: IncomingMessage;
};

export interface ReqRes {
  req: IncomingMessage;
  res: Response;
}

export type NextMiddlware<
  ParamKey extends string,
  Input extends Prefix<ParamKey, ReqRes>,
  Output extends Prefix<ParamKey, ReqRes>,
> = (data: Input) => Promise<Output>;

export type Next<ParamKey extends string, Input extends Prefix<ParamKey, ReqRes>> = (
  data: Input,
) => Promise<void> | Promise<NextResponse> | NextResponse | void;

export type NextPromise<ParamKey extends string, Input extends Prefix<ParamKey, ReqRes>> = (
  data: Input,
) => Promise<void> | Promise<NextResponse | undefined>;
