import { afterAll, beforeAll } from 'bun:test';
import type { routes } from '@container/http/route';
import { TestServer } from '@container/test/server';

export const useTestServer = (...testRoutes: Parameters<typeof routes>): TestServer => {
  const server = new TestServer();

  beforeAll(async () => {
    await server.start(...testRoutes);
  });

  afterAll(() => {
    server.stop();
  });

  return server;
};
