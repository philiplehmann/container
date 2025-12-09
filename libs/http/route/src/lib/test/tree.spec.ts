import { describe, expect, it } from 'bun:test';
import { useTestServer } from '@container/test/bun';
import { get } from '../method/get';
import { routes } from '../routes';

const api = routes(
  get('/', async ({ req, params }) => {
    return { statusCode: 200, body: { url: req.url, params } };
  }),
);

describe('http-route', () => {
  describe('create tree with multiple routes and route', () => {
    const server = useTestServer(routes({ path: 'api' }, routes({ path: 'v1' }, api), routes({ path: 'v2' }, api)));

    describe('index', () => {
      it('v1', async () => {
        const response = await server.request('/api/v1', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.json();
        expect(content).toEqual({ url: '/api/v1', params: {} });
      });

      it('v2', async () => {
        const response = await server.request('/api/v2', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.json();
        expect(content).toEqual({ url: '/api/v2', params: {} });
      });
    });
  });

  describe('create tree with multiple routes and route with regex', () => {
    const server = useTestServer(routes({ path: 'api' }, routes({ path: /v\d+/, name: 'version' }, api)));

    describe('index', () => {
      it('v1', async () => {
        const response = await server.request('/api/v1', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.json();
        expect(content).toEqual({ url: '/api/v1', params: { version: 'v1' } });
      });

      it('v2', async () => {
        const response = await server.request('/api/v2', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.json();
        expect(content).toEqual({ url: '/api/v2', params: { version: 'v2' } });
      });
    });
  });

  describe('create tree with multiple routes and route with regex', () => {
    const server = useTestServer(
      routes(
        { path: 'api' },
        routes({ path: /v\d+/, name: 'version1' }, routes({ path: /\d+/, name: 'version2' }, api), api),
      ),
    );

    describe('index', () => {
      it('v1', async () => {
        const response = await server.request('/api/v1', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.json();
        expect(content).toEqual({ url: '/api/v1', params: { version1: 'v1' } });
      });

      it('v2', async () => {
        const response = await server.request('/api/v2', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.json();
        expect(content).toEqual({ url: '/api/v2', params: { version1: 'v2' } });
      });

      it('v2/1', async () => {
        const response = await server.request('/api/v2/1', {
          method: 'GET',
        });
        expect(response.status).toEqual(200);
        const content = await response.json();
        expect(content).toEqual({ url: '/api/v2/1', params: { version1: 'v2', version2: '1' } });
      });
    });
  });
});
