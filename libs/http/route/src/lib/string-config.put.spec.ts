import { put } from './put';
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
          put('/put', async ({ res }) => {
            await res.write('put');
            await res.end();
          }),
        ),
      );
    });

    afterAll(() => {
      httpServer.close();
    });

    describe('put', () => {
      it('200', async () => {
        const response = await fetch(`http://localhost:${port}/put`, {
          method: 'PUT',
        });
        const content = await response.text();
        expect(content).toEqual('put');
      });

      it('404', async () => {
        const response = await fetch(`http://localhost:${port}/other`, {
          method: 'PUT',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
