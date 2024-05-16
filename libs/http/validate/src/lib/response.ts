import type { IncomingMessage, ServerResponse } from 'node:http';

export type Response = ServerResponse<IncomingMessage> & {
  req: IncomingMessage;
};
