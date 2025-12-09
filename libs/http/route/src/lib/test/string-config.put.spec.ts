import { describe, expect, it } from 'bun:test';
import { useTestServer } from '@container/test/bun';
import { put } from '../method/put';

describe('http-route', () => {
  describe('string path config', () => {
    const server = useTestServer(
      put('/put', ({ res }) => {
        res.end('put');
      }),
    );

    describe('put', () => {
      it('200', async () => {
        const response = await server.request('/put', {
          method: 'PUT',
        });
        const content = await response.text();
        expect(content).toEqual('put');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'PUT',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
