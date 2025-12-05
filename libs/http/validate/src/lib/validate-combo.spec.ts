import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { post, put } from '@container/http/route';
import { useTestServer } from '@container/test/server';
import { z } from 'zod/v4';
import { middlewareBody, nextBody } from './body';
import { middlewareQuery, nextQuery } from './query';

const schema = z.strictObject({ key: z.string() });

describe('validate-combo', () => {
  describe('middlewareBody', () => {
    const server = useTestServer(
      post(
        '/http-validate/combo/middlewareBody',
        middlewareBody(schema),
        middlewareQuery(schema),
        async ({ body, query }) => {
          return { statusCode: 200, body: { body, query } };
        },
      ),
    );

    it('validate success', async () => {
      const response = await server.request('/http-validate/combo/middlewareBody?key=value', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), { body: { key: 'value' }, query: { key: 'value' } });
    });

    it('validate error', async () => {
      const response = await server.request('/http-validate/combo/middlewareBody?wrong=value', {
        method: 'POST',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(response.status, 400);
    });
  });

  describe('validateBody', () => {
    const server = useTestServer(
      post(
        '/http-validate/combo/validateBody',
        middlewareQuery(schema),
        nextBody(schema, ({ body, query }) => {
          return { statusCode: 200, body: { body, query } };
        }),
      ),
    );

    it('validate success', async () => {
      const response = await server.request('/http-validate/combo/validateBody?key=value', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), { body: { key: 'value' }, query: { key: 'value' } });
    });

    it('validate error', async () => {
      const response = await server.request('/http-validate/combo/validateBody?wrong=value', {
        method: 'POST',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(response.status, 400);
    });
  });
  describe('middlewareQuery', () => {
    const server = useTestServer(
      put(
        '/http-validate/combo/middlewareQuery',
        middlewareQuery(schema),
        middlewareBody(schema),
        async ({ query, body }) => {
          return { statusCode: 200, body: { body, query } };
        },
      ),
    );

    it('validate success', async () => {
      const response = await server.request('/http-validate/combo/middlewareQuery?key=value', {
        method: 'PUT',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), { body: { key: 'value' }, query: { key: 'value' } });
    });

    it('validate error', async () => {
      const response = await server.request('/http-validate/combo/middlewareQuery?wrong=value', {
        method: 'PUT',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(response.status, 400);
    });
  });

  describe('validateQuery', () => {
    const server = useTestServer(
      put(
        '/http-validate/combo/validateQuery',
        middlewareBody(schema),
        nextQuery(schema, ({ query, body }) => {
          return { statusCode: 200, body: { body, query } };
        }),
      ),
    );

    it('validate success', async () => {
      const response = await server.request('/http-validate/combo/validateQuery?key=value', {
        method: 'PUT',
        body: JSON.stringify({ key: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), { body: { key: 'value' }, query: { key: 'value' } });
    });

    it('validate error', async () => {
      const response = await server.request('/http-validate/combo/validateQuery?wrong=value', {
        method: 'PUT',
        body: JSON.stringify({ wrong: 'value' }),
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(response.status, 400);
    });
  });
});
