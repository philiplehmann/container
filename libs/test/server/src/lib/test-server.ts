import { createServer, type IncomingMessage, type RequestListener, type Server, type ServerResponse } from 'node:http';

export const testServer = <
  Request extends typeof IncomingMessage = typeof IncomingMessage,
  Response extends typeof ServerResponse = typeof ServerResponse,
>(
  requestListener?: RequestListener<Request, Response>,
): Promise<[Server<Request, Response>, number]> => {
  return new Promise((resolve, reject) => {
    const httpServer = createServer(requestListener).listen(0, () => {
      const address = httpServer.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        console.info('test server started 🚀 on port', port);
        return resolve([httpServer, port]);
      }
      reject();
    });
  });
};
