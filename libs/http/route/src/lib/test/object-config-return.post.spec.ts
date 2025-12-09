import { describe, expect, it } from 'bun:test';
import { useTestServer } from '@container/test/bun';
import { post } from '../method/post';

describe('http-route', () => {
  describe('object config return', () => {
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
