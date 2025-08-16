import { type IncomingMessage, request, type Server } from 'node:http';
import { connect, type routes } from '@container/http/route';
import FormData from 'form-data';
import { testServer } from './test-server';

export class TestServer {
  private server?: Server;

  public set httpServer(server: Server) {
    this.server = server;
  }
  public get httpServer(): Server {
    if (!this.server) {
      throw new Error('server not yet set');
    }
    return this.server;
  }

  public get port(): number {
    const address = this.httpServer.address();
    if (address && typeof address === 'object') {
      const port = address.port;
      return port;
    }
    throw new Error('port not found in address');
  }

  public request(
    path: string,
    options: { formData: FormData; method?: 'POST' | 'PUT' | 'PATCH' },
  ): Promise<IncomingMessage>;
  public request(path: string, options?: Parameters<typeof fetch>[1]): Promise<Response>;
  public request(
    path: string,
    options?: Parameters<typeof fetch>[1] | { formData: FormData; method?: 'POST' | 'PUT' | 'PATCH' },
  ): Promise<Response> | Promise<IncomingMessage> {
    if (options && 'formData' in options && options.formData instanceof FormData) {
      return new Promise<IncomingMessage>((resolve, reject) => {
        const url = new URL(path, `http://localhost:${this.port}`);
        const req = request({
          method: options.method || 'POST',
          host: url.hostname,
          port: url.port,
          path: url.pathname,
          headers: options.formData.getHeaders(),
        });

        options.formData.pipe(req);

        req.on('response', (res) => {
          resolve(res);
        });
        req.on('error', (err) => {
          reject(err);
        });
      });
    }
    return fetch(`http://localhost:${this.port}${path}`, options);
  }

  public async start(...testRoutes: Parameters<typeof routes>) {
    try {
      const [httpServer] = await testServer(connect(...testRoutes));
      this.httpServer = httpServer;
    } catch (error) {
      console.error(error);
      this.stop();
    }
  }

  public stop() {
    this.httpServer.close();
  }
}

export const useTestServer = async (...testRoutes: Parameters<typeof routes>): Promise<TestServer> => {
  const { beforeAll, afterAll } = await import('vitest');
  const server = new TestServer();

  beforeAll(async () => {
    await server.start(...testRoutes);
  });

  afterAll(() => {
    server.stop();
  });
  return server;
};
