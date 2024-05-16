import { get } from './get';
import { routes } from './routes';
import type { Server } from 'node:http';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { testServer } from '@container/test/server';

describe('http-route', () => {
  describe('string path config', async () => {
    let httpServer: Server;
    let port: number;
    beforeAll(async () => {
      [httpServer, port] = await testServer(
        routes(
          get('/get', async ({ res }) => {
            await res.write('get');
            await res.end();
          }),
        ),
      );
    });

    afterAll(() => {
      httpServer.close();
    });
    describe('get', () => {
      it('200', async () => {
        const response = await fetch(`http://localhost:${port}/get`, {
          method: 'GET',
        });
        const content = await response.text();
        expect(content).toEqual('get');
      });

      it('404', async () => {
        const response = await fetch(`http://localhost:${port}/other`, {
          method: 'GET',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
