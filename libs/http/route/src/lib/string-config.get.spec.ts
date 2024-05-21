import { get } from './get';
import { describe, it, expect } from 'vitest';
import { useTestServer } from '@container/test/server';

describe('http-route', () => {
  describe('string path config', async () => {
    const server = useTestServer(
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
