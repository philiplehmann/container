import { get } from './get';
import { describe, it, expect } from 'vitest';
import { useTestServer } from '@container/test/server';

describe('http-route', () => {
  describe('object config return', async () => {
    const server = useTestServer(
      get({ path: '/get' }, async () => {
        return { statusCode: 200, body: 'get' };
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
