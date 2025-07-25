import { useTestServer } from '@container/test/server';
import { describe, expect, it } from 'vitest';
import { put } from '../method/put';

describe('http-route', () => {
  describe('string path config return', async () => {
    const server = await useTestServer(
      put({ path: '/put' }, async () => {
        return { statusCode: 200, body: 'put' };
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
