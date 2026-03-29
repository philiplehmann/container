import { describe, expect, it } from 'bun:test';
import { get, post } from '@riwi/http/route';
import { useTestServer } from '@riwi/test/bun';
import { z } from 'zod/v4';
import { middlewareBody, nextBody } from './body';
import { middlewareQuery, nextQuery } from './query';

const schema = z.strictObject({ key: z.string() });
type SchemaInput = z.infer<typeof schema>;

describe('validate-single', () => {
  describe('middlewareBody', () => {
    const server = useTestServer(
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

  describe('validateBody', () => {
    const server = useTestServer(
      post(
        '/http-validate/single/validateBody',
        nextBody(schema, ({ body }: { body: SchemaInput }) => {
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
  describe('middlewareQuery', () => {
    const server = useTestServer(
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

  describe('validateQuery', () => {
    const server = useTestServer(
      get(
        '/http-validate/single/validateQuery',
        nextQuery(schema, ({ query }: { query: SchemaInput }) => {
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
