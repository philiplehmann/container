import { patch } from './patch';
import { routes } from './routes';
import type { Server } from 'node:http';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { testServer } from '@container/test/server';

describe('http-route', () => {
  describe('object config', async () => {
    let httpServer: Server;
    let port: number;
    beforeAll(async () => {
      [httpServer, port] = await testServer(
        routes(
          patch({ path: '/patch' }, async ({ res }) => {
            await res.write('patch');
            await res.end();
          }),
        ),
      );
    });

    afterAll(() => {
      httpServer.close();
    });

    describe('patch', () => {
      it('200', async () => {
        const response = await fetch(`http://localhost:${port}/patch`, {
          method: 'PATCH',
        });
        const content = await response.text();
        expect(content).toEqual('patch');
      });

      it('404', async () => {
        const response = await fetch(`http://localhost:${port}/other`, {
          method: 'PATCH',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
