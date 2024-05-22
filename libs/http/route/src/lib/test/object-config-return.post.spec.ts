import { post } from '../method/post';
import { describe, it, expect } from 'vitest';
import { useTestServer } from '@container/test/server';

describe('http-route', () => {
  describe('object config return', async () => {
    const server = useTestServer(
      post({ path: '/post' }, async () => {
        return { statusCode: 200, body: 'post' };
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
