import { describe, expect, it, vi } from 'bun:test';
import { createReadStream } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { dirname, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { post } from '@container/http/route';
import { streamToBuffer, streamToString } from '@container/stream';
import { TestServer } from '@container/test/server';
import {
  getContentDispositionName,
  requestToBuffer,
  requestToJson,
  requestToMultipartFormData,
  requestToText,
} from '../index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const createTestServer = async (callback: (req: IncomingMessage) => Promise<void>): Promise<TestServer> => {
  const server = new TestServer();
  await server.start(
    post('/', async ({ req, res }) => {
      await callback(req);
      res.statusCode = 200;
      res.end();
      server.stop();
    }),
  );
  return server;
};

const pdftkAsset = (filename: string) => resolve(__dirname, '../../../../../apps/pdftk/src/test/assets', filename);

describe('http-body', () => {
  it('requestToJson', async () => {
    const server = await createTestServer(async (req) => {
      const body = await requestToJson(req);
      expect(body).toEqual({ key: 'value' });
    });
    const response = await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status).toBe(200);
  });

  it('requestToText', async () => {
    const server = await createTestServer(async (req) => {
      const body = await requestToText(req);
      expect(body).toEqual('{"key":"value"}');
    });
    const response = await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'text/plain' },
    });

    expect(response.status).toBe(200);
  });

  it('requestToBuffer', async () => {
    const server = await createTestServer(async (req) => {
      const body = await requestToBuffer(req);
      expect(body).toBeInstanceOf(Buffer);
    });
    const response = await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(response.status).toBe(200);
  });

  it('requestToMultipartFormData', async () => {
    const values = {
      file_compressed: pdftkAsset('compressed.pdf'),
      file_encrypted: pdftkAsset('encrypted.pdf'),
      file_form: pdftkAsset('form.pdf'),
      file_uncompressed: pdftkAsset('uncompressed.pdf'),
      firstname: 'John',
      lastname: 'Doe',
    } as const;

    const isName = (name: string): name is keyof typeof values => name in values;

    const mockPart = vi.fn().mockImplementation(async (header: Headers, stream: Readable) => {
      const { filename, name } = getContentDispositionName(header);

      if (filename && isName(name) && name.startsWith('file_')) {
        const netbuffer = await streamToBuffer(stream);
        const filebuffer = await streamToBuffer(createReadStream(values[name]));

        expect(netbuffer.length - filebuffer.length).toBeLessThanOrEqual(1);
        expect(netbuffer.length - filebuffer.length).toBeGreaterThanOrEqual(0);
        return;
      }

      if (isName(name)) {
        const content = await streamToString(stream);
        expect(content).toEqual(values[name]);
        return;
      }
      throw new Error(`Unexpected part: ${name}`);
    });

    const server = await createTestServer(async (req) => {
      await requestToMultipartFormData(req, mockPart);
      expect(mockPart).toBeCalledTimes(6);
    });

    const formData = new FormData();
    formData.append('firstname', values.firstname);
    formData.append('lastname', values.lastname);
    formData.append('file_compressed', Bun.file(values.file_compressed));
    formData.append('file_encrypted', Bun.file(values.file_encrypted));
    formData.append('file_form', Bun.file(values.file_form));
    formData.append('file_uncompressed', Bun.file(values.file_uncompressed));

    const response = await server.request('/', {
      method: 'POST',
      body: formData,
    });
    expect(response.status).toBe(200);
  });
});
