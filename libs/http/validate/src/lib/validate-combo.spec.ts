import type { Server } from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { post, put, routes } from '@container/http/route';
import { testServer } from '@container/test/server';
import { middlewareBody, nextBody } from './body';
import { middlewareQuery, nextQuery } from './query';

const schema = z.strictObject({ key: z.string() });

describe('validate-combo', () => {
  describe('middlewareBody', () => {
    let httpServer: Server;
    let port: number;

    beforeAll(async () => {
      [httpServer, port] = await testServer(
        routes(
          post(
            '/http-validate/combo/middlewareBody',
            middlewareBody(schema),
            middlewareQuery(schema),
            async ({ body, query }) => {
              return { statusCode: 200, body: { body, query } };
            },
          ),
        ),
      );
    });

    afterAll(async () => {
      httpServer.close();
    });

    it('validate success', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/combo/middlewareBody?key=value`, {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ body: { key: 'value' }, query: { key: 'value' } });
    });

    it('validate error', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/combo/middlewareBody?wrong=value`, {
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
            '/http-validate/combo/validateBody',
            middlewareQuery(schema),
            nextBody(schema, ({ body, query }) => {
              return { statusCode: 200, body: { body, query } };
            }),
          ),
        ),
      );
    });

    afterAll(async () => {
      httpServer.close();
    });

    it('validate success', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/combo/validateBody?key=value`, {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ body: { key: 'value' }, query: { key: 'value' } });
    });

    it('validate error', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/combo/validateBody?wrong=value`, {
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
          put(
            '/http-validate/combo/middlewareQuery',
            middlewareQuery(schema),
            middlewareBody(schema),
            async ({ query, body }) => {
              return { statusCode: 200, body: { body, query } };
            },
          ),
        ),
      );
    });

    afterAll(async () => {
      httpServer.close();
    });

    it('validate success', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/combo/middlewareQuery?key=value`, {
        method: 'PUT',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ body: { key: 'value' }, query: { key: 'value' } });
    });

    it('validate error', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/combo/middlewareQuery?wrong=value`, {
        method: 'PUT',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
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
          put(
            '/http-validate/combo/validateQuery',
            middlewareBody(schema),
            nextQuery(schema, ({ query, body }) => {
              return { statusCode: 200, body: { body, query } };
            }),
          ),
        ),
      );
    });

    afterAll(async () => {
      httpServer.close();
    });

    it('validate success', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/combo/validateQuery?key=value`, {
        method: 'PUT',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ body: { key: 'value' }, query: { key: 'value' } });
    });

    it('validate error', async () => {
      const response = await fetch(`http://localhost:${port}/http-validate/combo/validateQuery?wrong=value`, {
        method: 'PUT',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(400);
    });
  });
});
