import { del } from '../method/del';
import { describe, it, expect } from 'vitest';
import { useTestServer } from '@container/test/server';
import { routes } from '../routes';
import { get } from '../method/get';

const api = routes(
  get('/', async ({ req }) => {
    return { statusCode: 200, body: req.url };
  }),
);

describe('http-route', () => {
  describe('create tree with multiple routes and route', async () => {
    const server = useTestServer(routes({ path: 'api' }, routes({ path: 'v1' }, api), routes({ path: 'v2' }, api)));

    describe('index', () => {
      it('v1', async () => {
        const response = await server.request('/api/v1', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.text();
        expect(content).toEqual('/api/v1');
      });

      it('v2', async () => {
        const response = await server.request('/api/v2', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.text();
        expect(content).toEqual('/api/v2');
      });
    });
  });
});
