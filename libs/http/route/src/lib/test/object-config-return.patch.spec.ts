import { describe, expect, it } from 'bun:test';
import { useTestServer } from '@container/test/bun';
import { patch } from '../method/patch';

describe('http-route', () => {
  describe('object config return', () => {
    const server = useTestServer(
      patch({ path: '/patch' }, async () => {
        return { statusCode: 200, body: 'patch' };
      }),
    );

    describe('patch', () => {
      it('200', async () => {
        const response = await server.request('/patch', {
          method: 'PATCH',
        });
        const content = await response.text();
        expect(content).toEqual('patch');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'PATCH',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
