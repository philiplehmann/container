import type { IncomingMessage } from 'node:http';
import { resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { post } from '@container/http/route';
import { TestServer } from '@container/test/server';
import { streamToBuffer, streamToString } from '@container/stream';
import {
  StreamableFile,
  requestToBuffer,
  requestToJson,
  requestToMultipartFormData,
  requestToText,
  getContentDispositionName,
} from '../index';

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
    const [compressed, encrypted, form, uncompressed] = await Promise.all([
      StreamableFile.from(pdftkAsset('compressed.pdf')),
      StreamableFile.from(pdftkAsset('encrypted.pdf')),
      StreamableFile.from(pdftkAsset('form.pdf')),
      StreamableFile.from(pdftkAsset('uncompressed.pdf')),
    ]);

    const values = {
      compressed,
      encrypted,
      form,
      uncompressed,
      firstname: 'John',
      lastname: 'Doe',
    } as const;

    const isName = (name: string): name is keyof typeof values => name in values;

    const mockPart = vi.fn().mockImplementation(async (header: Headers, stream: Readable) => {
      const { filename, name } = getContentDispositionName(header);

      if (filename && isName(name) && values[name] instanceof StreamableFile) {
        const netbuffer = await streamToBuffer(stream);
        const filebuffer = await streamToBuffer(createReadStream(values[name].path));

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
    formData.append('compressed', values.compressed);
    formData.append('encrypted', values.encrypted);
    formData.append('form', values.form);
    formData.append('uncompressed', values.uncompressed);

    const response = await server.request('/', {
      method: 'POST',
      body: formData,
    });
    console.log(await response.text());
    expect(response.status).toBe(200);
  });
});
