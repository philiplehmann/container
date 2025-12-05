import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { useTestServer } from '@container/test/server';
import { del } from '../method/del';

describe('http-route', () => {
  describe('string path config', () => {
    const server = useTestServer(
      del('/delete', async ({ res }) => {
        res.statusCode = 200;
        res.write('delete');
        res.end();
      }),
    );

    describe('delete', () => {
      it('200', async () => {
        const response = await server.request('/delete', {
          method: 'DELETE',
        });
        assert.deepStrictEqual(response.status, 200);
        const content = await response.text();
        assert.deepStrictEqual(content, 'delete');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'DELETE',
        });
        assert.deepStrictEqual(response.status, 404);
      });
    });
  });
});
