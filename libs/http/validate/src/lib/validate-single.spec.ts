import type { Server } from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { get, post, routes } from '@container/http/route';
import { testServer } from '@container/test/server';
import { middlewareBody, nextBody } from './body';
import { middlewareQuery, nextQuery } from './query';

const schema = z.strictObject({ key: z.string() });

describe('validate-single', () => {
  describe('middlewareBody', () => {
    let httpServer: Server;
    let port: number;

    beforeAll(async () => {
      [httpServer, port] = await testServer(
        routes(
          post('/http-validate/single/middlewareBody', middlewareBody(schema), async ({ body }) => {
            return { statusCode: 200, body };
          }),
        ),
      );
    });

    afterAll(async () => {
      httpServer.close();
    });

    it('validate success', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/single/middlewareBody`, {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('validate error', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/single/middlewareBody`, {
        method: 'POST',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('validateBody', () => {
    let httpServer: Server;
    let port: number;

    beforeAll(async () => {
      [httpServer, port] = await testServer(
        routes(
          post(
            '/http-validate/single/validateBody',
            nextBody(schema, ({ body }) => {
              return { statusCode: 200, body };
            }),
          ),
        ),
      );
    });

    afterAll(async () => {
      httpServer.close();
    });

    it('validate success', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/single/validateBody`, {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('validate error', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/single/validateBody`, {
        method: 'POST',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(400);
    });
  });
  describe('middlewareQuery', () => {
    let httpServer: Server;
    let port: number;

    beforeAll(async () => {
      [httpServer, port] = await testServer(
        routes(
          get('/http-validate/single/middlewareQuery', middlewareQuery(schema), async ({ query }) => {
            return { statusCode: 200, body: query };
          }),
        ),
      );
    });

    afterAll(async () => {
      httpServer.close();
    });

    it('validate success', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/single/middlewareQuery?key=value`, {
        method: 'GET',
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('validate error', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/single/middlewareQuery?wrong=value`, {
        method: 'GET',
      });
      expect(response.status).toBe(400);
    });
  });

  describe('validateQuery', () => {
    let httpServer: Server;
    let port: number;

    beforeAll(async () => {
      [httpServer, port] = await testServer(
        routes(
          get(
            '/http-validate/single/validateQuery',
            nextQuery(schema, ({ query }) => {
              return { statusCode: 200, body: query };
            }),
          ),
        ),
      );
    });

    afterAll(async () => {
      httpServer.close();
    });

    it('validate success', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/single/validateQuery?key=value`, {
        method: 'GET',
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('validate error', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/single/validateQuery?wrong=value`, {
        method: 'GET',
      });
      expect(response.status).toBe(400);
    });
  });
});
