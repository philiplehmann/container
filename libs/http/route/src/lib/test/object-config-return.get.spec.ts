import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { useTestServer } from '@container/test/server';
import { get } from '../method/get';

describe('http-route', () => {
  describe('object config return', () => {
    const server = useTestServer(
      get({ path: '/get' }, async () => {
        return { statusCode: 200, body: 'get' };
      }),
    );

    describe('get', () => {
      it('200', async () => {
        const response = await server.request('/get', {
          method: 'GET',
        });
        const content = await response.text();
        assert.deepStrictEqual(content, 'get');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'GET',
        });
        assert.deepStrictEqual(response.status, 404);
      });
    });
  });
});
