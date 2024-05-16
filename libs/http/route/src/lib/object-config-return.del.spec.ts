import { del } from './del';
import { routes } from './routes';
import type { Server } from 'node:http';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { testServer } from '@container/test/server';

describe('http-route', () => {
  describe('object config return', async () => {
    let httpServer: Server;
    let port: number;
    beforeAll(async () => {
      [httpServer, port] = await testServer(
        routes(
          del({ path: '/delete' }, async () => {
            return { statusCode: 200, body: 'delete' };
          }),
        ),
      );
    });

    afterAll(() => {
      httpServer.close();
    });

    describe('delete', () => {
      it('200', async () => {
        const response = await fetch(`http://localhost:${port}/delete`, {
          method: 'DELETE',
        });
        expect(response.status).toEqual(200);
        const content = await response.text();
        expect(content).toEqual('delete');
      });

      it('404', async () => {
        const response = await fetch(`http://localhost:${port}/other`, {
          method: 'DELETE',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
