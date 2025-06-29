import { useTestServer } from '@container/test/server';
import { describe, expect, it } from 'vitest';
import { post } from '../method/post';

describe('http-route', () => {
  describe('object config', async () => {
    const server = await useTestServer(
      post({ path: '/post' }, async ({ res }) => {
        await res.write('post');
        await res.end();
      }),
    );

    describe('post', () => {
      it('200', async () => {
        const response = await server.request('/post', {
          method: 'POST',
        });
        const content = await response.text();
        expect(content).toEqual('post');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'POST',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
