import type { Server } from 'node:http';
import { get, post, routes } from '@container/http/route';
import { testServer, useTestServer } from '@container/test/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { middlewareBody, nextBody } from './body';
import { middlewareQuery, nextQuery } from './query';

const schema = z.strictObject({ key: z.string() });

describe('validate-single', () => {
  describe('middlewareBody', async () => {
    const server = await useTestServer(
      post('/http-validate/single/middlewareBody', middlewareBody(schema), async ({ body }) => {
        return { statusCode: 200, body };
      }),
    );

    it('validate success', async () => {
      const response = await server.request('/http-validate/single/middlewareBody', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('validate error', async () => {
      const response = await server.request('/http-validate/single/middlewareBody', {
        method: 'POST',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('validateBody', async () => {
    const server = await useTestServer(
      post(
        '/http-validate/single/validateBody',
        nextBody(schema, ({ body }) => {
          return { statusCode: 200, body };
        }),
      ),
    );

    it('validate success', async () => {
      const response = await server.request('/http-validate/single/validateBody', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('validate error', async () => {
      const response = await server.request('/http-validate/single/validateBody', {
        method: 'POST',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(400);
    });
  });
  describe('middlewareQuery', async () => {
    const server = await useTestServer(
      get('/http-validate/single/middlewareQuery', middlewareQuery(schema), async ({ query }) => {
        return { statusCode: 200, body: query };
      }),
    );

    it('validate success', async () => {
      const response = await server.request('/http-validate/single/middlewareQuery?key=value', {
        method: 'GET',
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('validate error', async () => {
      const response = await server.request('/http-validate/single/middlewareQuery?wrong=value', {
        method: 'GET',
      });
      expect(response.status).toBe(400);
    });
  });

  describe('validateQuery', async () => {
    const server = await useTestServer(
      get(
        '/http-validate/single/validateQuery',
        nextQuery(schema, ({ query }) => {
          return { statusCode: 200, body: query };
        }),
      ),
    );

    it('validate success', async () => {
      const response = await server.request('/http-validate/single/validateQuery?key=value', {
        method: 'GET',
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('validate error', async () => {
      const response = await server.request('/http-validate/single/validateQuery?wrong=value', {
        method: 'GET',
      });
      expect(response.status).toBe(400);
    });
  });
});
