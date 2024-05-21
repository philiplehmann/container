import { del } from './del';
import { describe, it, expect } from 'vitest';
import { useTestServer } from '@container/test/server';

describe('http-route', () => {
  describe('string path config', async () => {
    const server = useTestServer(
      del('/delete', async ({ res }) => {
        res.statusCode = 200;
        res.write('delete');
        res.end();
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
