import type { Server } from 'node:http';
import { testServer } from './test-server';
import { connect, type routes } from '@container/http/route';

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

  public request(path: string, options: Parameters<typeof fetch>[1]): Promise<Response> {
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
