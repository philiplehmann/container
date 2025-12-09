import { describe, expect, it } from 'bun:test';
import { useTestServer } from '@container/test/bun';
import { patch } from '../method/patch';

describe('http-route', () => {
  describe('string path config', () => {
    const server = useTestServer(
      patch('/patch', async ({ res }) => {
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
