import { createServer, type IncomingMessage } from 'node:http';
import { describe, it, expect } from 'vitest';

import { requestToJson, requestToText, requestToBuffer } from './http-body';
import { post } from '@container/http/route';

const createTestServer = async (callback: (req: IncomingMessage) => Promise<void>): Promise<number> => {
  const httpServer = createServer(
    post({ path: '/' }, async ({ req, res }) => {
      await callback(req);
      res.end();
      httpServer.close();
    }),
  );
  return new Promise<number>((resolve, reject) => {
    httpServer.listen(0, () => {
      const address = httpServer.address();
      if (address && typeof address === 'object') {
        return resolve(address.port);
      }
      reject();
    });
  });
};

describe('http-body', () => {
  it('requestToJson', async () => {
    const port = await createTestServer(async (req) => {
      const body = await requestToJson(req);
      expect(body).toEqual({ key: 'value' });
    });
    await fetch(`http://localhost:${port}`, {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('requestToText', async () => {
    const port = await createTestServer(async (req) => {
      const body = await requestToText(req);
      expect(body).toEqual('{"key":"value"}');
    });
    await fetch(`http://localhost:${port}`, {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'text/plain' },
    });
  });

  it('requestToBuffer', async () => {
    const port = await createTestServer(async (req) => {
      const body = await requestToBuffer(req);
      expect(body).toBeInstanceOf(Buffer);
    });
    await fetch(`http://localhost:${port}`, {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'text/plain' },
    });
  });
});
