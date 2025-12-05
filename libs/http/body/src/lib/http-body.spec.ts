import { strict as assert } from 'node:assert';
import { createReadStream } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import { post } from '@container/http/route';
import { streamToBuffer, streamToString } from '@container/stream';
import { TestServer } from '@container/test/server';
import FormData from 'form-data';

import {
  getContentDispositionName,
  requestToBuffer,
  requestToJson,
  requestToMultipartFormData,
  requestToText,
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
      assert.deepStrictEqual(body, { key: 'value' });
    });
    const response = await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    });
    assert.strictEqual(response.status, 200);
  });

  it('requestToText', async () => {
    const server = await createTestServer(async (req) => {
      const body = await requestToText(req);
      assert.deepStrictEqual(body, '{"key":"value"}');
    });
    const response = await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'text/plain' },
    });

    assert.strictEqual(response.status, 200);
  });

  it('requestToBuffer', async () => {
    const server = await createTestServer(async (req) => {
      const body = await requestToBuffer(req);
      assert.ok(body instanceof Buffer);
    });
    const response = await server.request('/', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'text/plain' },
    });
    assert.strictEqual(response.status, 200);
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

    let mockPartCalls = 0;
    const mockPart = async (header: Headers, stream: Readable) => {
      const { filename, name } = getContentDispositionName(header);

      if (filename && isName(name) && name.startsWith('file_')) {
        const netbuffer = await streamToBuffer(stream);
        const filebuffer = await streamToBuffer(createReadStream(values[name]));

        const diff = netbuffer.length - filebuffer.length;
        assert.ok(diff <= 1);
        assert.ok(diff >= 0);
        mockPartCalls += 1;
        return;
      }

      if (isName(name)) {
        const content = await streamToString(stream);
        assert.deepStrictEqual(content, values[name]);
        mockPartCalls += 1;
        return;
      }
      throw new Error(`Unexpected part: ${name}`);
    };

    const server = await createTestServer(async (req) => {
      await requestToMultipartFormData(req, mockPart);
      assert.strictEqual(mockPartCalls, 6);
    });

    const formData = new FormData();
    formData.append('firstname', values.firstname);
    formData.append('lastname', values.lastname);
    formData.append('file_compressed', createReadStream(values.file_compressed));
    formData.append('file_encrypted', createReadStream(values.file_encrypted));
    formData.append('file_form', createReadStream(values.file_form));
    formData.append('file_uncompressed', createReadStream(values.file_uncompressed));

    const response = await server.request('/', {
      method: 'POST',
      formData,
    });
    assert.strictEqual(response.statusCode, 200);
  });
});
