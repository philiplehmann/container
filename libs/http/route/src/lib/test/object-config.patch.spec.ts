import { useTestServer } from '@container/test/server';
import { describe, expect, it } from 'vitest';
import { patch } from '../method/patch';

describe('http-route', () => {
  describe('object config', async () => {
    const server = await useTestServer(
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
