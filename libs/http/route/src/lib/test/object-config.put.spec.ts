import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { useTestServer } from '@container/test/server';
import { put } from '../method/put';

describe('http-route', () => {
  describe('object config', () => {
    const server = useTestServer(
      put({ path: '/put' }, async ({ res }) => {
        await res.write('put');
        await res.end();
      }),
    );

    describe('put', () => {
      it('200', async () => {
        const response = await server.request('/put', {
          method: 'PUT',
        });
        const content = await response.text();
        assert.deepStrictEqual(content, 'put');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'PUT',
        });
        assert.deepStrictEqual(response.status, 404);
      });
    });
  });
});
