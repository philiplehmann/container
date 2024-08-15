import { del } from '../method/del';
import { describe, it, expect } from 'vitest';
import { useTestServer } from '@container/test/server';

describe('http-route', () => {
  describe('string path config return', async () => {
    const server = await useTestServer(
      del({ path: '/delete' }, async () => {
        return { statusCode: 200, body: 'delete' };
      }),
    );

    describe('delete', () => {
      it('200', async () => {
        const response = await server.request('/delete', {
          method: 'DELETE',
        });
        expect(response.status).toEqual(200);
        const content = await response.text();
        expect(content).toEqual('delete');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'DELETE',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
