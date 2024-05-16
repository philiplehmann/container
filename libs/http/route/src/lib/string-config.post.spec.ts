import { post } from './post';
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
          post('/post', async ({ res }) => {
            await res.write('post');
            await res.end();
          }),
        ),
      );
    });

    afterAll(() => {
      httpServer.close();
    });

    describe('post', () => {
      it('200', async () => {
        const response = await fetch(`http://localhost:${port}/post`, {
          method: 'POST',
        });
        const content = await response.text();
        expect(content).toEqual('post');
      });

      it('404', async () => {
        const response = await fetch(`http://localhost:${port}/other`, {
          method: 'POST',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
