import { after, before } from 'node:test';
import type { routes } from '@container/http/route';
import { TestServer } from '@container/test/server';

export const useTestServer = (...testRoutes: Parameters<typeof routes>): TestServer => {
  const server = new TestServer();

  before(async () => {
    await server.start(...testRoutes);
  });

  after(() => {
    server.stop();
  });

  return server;
};
