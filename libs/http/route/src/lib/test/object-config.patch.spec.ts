import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { useTestServer } from '@container/test/server';
import { patch } from '../method/patch';

describe('http-route', () => {
  describe('object config', () => {
    const server = useTestServer(
      patch({ path: '/patch' }, async ({ res }) => {
        await res.write('patch');
        await res.end();
      }),
    );

    describe('patch', () => {
      it('200', async () => {
        const response = await server.request('/patch', {
          method: 'PATCH',
        });
        const content = await response.text();
        assert.deepStrictEqual(content, 'patch');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'PATCH',
        });
        assert.deepStrictEqual(response.status, 404);
      });
    });
  });
});
