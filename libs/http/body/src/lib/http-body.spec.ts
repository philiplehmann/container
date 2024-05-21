import type { IncomingMessage } from 'node:http';
import { describe, it, expect } from 'vitest';

import { requestToJson, requestToText, requestToBuffer } from './http-body';
import { post } from '@container/http/route';
import { TestServer } from '@container/test/server';

const createTestServer = async (callback: (req: IncomingMessage) => Promise<void>): Promise<TestServer> => {
  const server = new TestServer();
  await server.start(
    post('/', async ({ req, res }) => {
      await callback(req);
      res.end();
      server.stop();
    }),
  );
  return server;
};

describe('http-body', () => {
  it('requestToJson', async () => {
    const server = await createTestServer(async (req) => {
      const body = await requestToJson(req);
      expect(body).toEqual({ key: 'value' });
    });
    await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('requestToText', async () => {
    const server = await createTestServer(async (req) => {
      const body = await requestToText(req);
      expect(body).toEqual('{"key":"value"}');
    });
    await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'text/plain' },
    });
  });

  it('requestToBuffer', async () => {
    const server = await createTestServer(async (req) => {
      const body = await requestToBuffer(req);
      expect(body).toBeInstanceOf(Buffer);
    });
    await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'text/plain' },
    });
  });
});
