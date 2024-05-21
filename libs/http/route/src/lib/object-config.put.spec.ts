import { put } from './put';
import { describe, it, expect } from 'vitest';
import { useTestServer } from '@container/test/server';

describe('http-route', () => {
  describe('object config', async () => {
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
