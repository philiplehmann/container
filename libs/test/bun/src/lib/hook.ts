import { afterAll, beforeAll } from 'bun:test';
import type { routes } from '@riwi/http/route';
import { TestServer } from '@riwi/test/server';

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
