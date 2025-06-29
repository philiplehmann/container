import { useTestServer } from '@container/test/server';
import { describe, expect, it } from 'vitest';
import { del } from '../method/del';

describe('http-route', () => {
  describe('object config return', async () => {
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
