import { useTestServer } from '@container/test/server';
import { describe, expect, it } from 'vitest';
import { get } from '../method/get';

describe('http-route', () => {
  describe('string path config', async () => {
    const server = await useTestServer(
      get('/get', async ({ res }) => {
        await res.write('get');
        await res.end();
      }),
    );
    describe('get', () => {
      it('200', async () => {
        const response = await server.request('/get', {
          method: 'GET',
        });
        const content = await response.text();
        expect(content).toEqual('get');
      });

      it('404', async () => {
        const response = await server.request('/other', {
          method: 'GET',
        });
        expect(response.status).toEqual(404);
      });
    });
  });
});
