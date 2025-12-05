import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { useTestServer } from '@container/test/server';
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
        assert.deepStrictEqual(content, 'post');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'POST',
        });
        assert.deepStrictEqual(response.status, 404);
      });
    });
  });
});
