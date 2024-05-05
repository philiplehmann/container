import { get, post, put, patch, del, routes } from './http-route';
import { type Server, createServer } from 'node:http';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';

describe('http-route', () => {
  let httpServer: Server;
  let port: number;
  beforeAll(() => {
    return new Promise<void>((resolve, reject) => {
      httpServer = createServer(
        routes(
          get({ path: '/get' }, async (req, res) => {
            await res.write('get');
            await res.end();
          }),
          post({ path: '/post' }, async (req, res) => {
            await res.write('post');
            await res.end();
          }),
          put({ path: '/put' }, async (req, res) => {
            await res.write('put');
            await res.end();
          }),
          patch({ path: '/patch' }, async (req, res) => {
            await res.write('patch');
            await res.end();
          }),
          del({ path: '/delete' }, async (req, res) => {
            await res.write('delete');
            await res.end();
          }),
        ),
      ).listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === 'object') {
          console.log('start poppler server on ', address.port);
          port = address.port;
          return resolve();
        }
        reject();
      });
    });
  });

  afterAll(() => {
    httpServer.close();
  });
  describe('get', () => {
    it('200', async () => {
      const response = await fetch(`http://localhost:${port}/get`, {
        method: 'GET',
      });
      const content = await response.text();
      expect(content).toEqual('get');
    });

    it('404', async () => {
      const response = await fetch(`http://localhost:${port}/other`, {
        method: 'GET',
      });
      expect(response.status).toEqual(404);
    });
  });

  describe('post', () => {
    it('200', async () => {
      const response = await fetch(`http://localhost:${port}/post`, {
        method: 'POST',
      });
      const content = await response.text();
      expect(content).toEqual('post');
    });

    it('404', async () => {
      const response = await fetch(`http://localhost:${port}/other`, {
        method: 'POST',
      });
      expect(response.status).toEqual(404);
    });
  });

  describe('put', () => {
    it('200', async () => {
      const response = await fetch(`http://localhost:${port}/put`, {
        method: 'PUT',
      });
      const content = await response.text();
      expect(content).toEqual('put');
    });

    it('404', async () => {
      const response = await fetch(`http://localhost:${port}/other`, {
        method: 'PUT',
      });
      expect(response.status).toEqual(404);
    });
  });

  describe('patch', () => {
    it('200', async () => {
      const response = await fetch(`http://localhost:${port}/patch`, {
        method: 'PATCH',
      });
      const content = await response.text();
      expect(content).toEqual('patch');
    });

    it('404', async () => {
      const response = await fetch(`http://localhost:${port}/other`, {
        method: 'PATCH',
      });
      expect(response.status).toEqual(404);
    });
  });

  describe('delete', () => {
    it('200', async () => {
      const response = await fetch(`http://localhost:${port}/delete`, {
        method: 'DELETE',
      });
      const content = await response.text();
      expect(content).toEqual('delete');
    });

    it('404', async () => {
      const response = await fetch(`http://localhost:${port}/other`, {
        method: 'DELETE',
      });
      expect(response.status).toEqual(404);
    });
  });
});
