import { createServer, type IncomingMessage, type RequestListener, type Server, type ServerResponse } from 'node:http';

export const httpServer = <
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
    console.log(`HTTP start 🚀 ${name} server on ${port}`);
  });

  process.on('SIGINT', () => {
    server.close();
  });

  return server;
};
