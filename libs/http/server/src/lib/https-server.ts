import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { createServer, type Server } from 'node:https';

export const httpsServer = <
  Request extends typeof IncomingMessage = typeof IncomingMessage,
  Response extends typeof ServerResponse = typeof ServerResponse,
>(
  routes: RequestListener<Request, Response>,
  {
    port,
    name,
  }: {
    port?: string;
    name?: string;
  },
): Server<Request, Response> => {
  const server = createServer<Request, Response>(routes).listen(port, () => {
    console.log(`HTTPS start 🚀 ${name} server on ${port}`);
  });

  process.on('SIGINT', () => {
    server.close();
  });

  return server;
};
