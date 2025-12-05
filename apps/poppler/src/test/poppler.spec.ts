import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { useTestContainer } from '@container/test/server';

const containerPort = 5000;

describe('poppler', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, async () => {
      const setup = await useTestContainer({ image: `philiplehmann/poppler-server:test-${arch}`, containerPort });

      it('should convert PDF to text', async () => {
        const file = resolve(__dirname, 'assets/dummy.pdf');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/pdf-to-text',
          headers: { 'Content-Type': 'application/pdf' },
          file,
        });

        assert.strictEqual(response.statusCode, 200);
        assert.ok(text.includes('Dummy PDF file'));
      });

      it('should convert PDF to HTML and include "Dummy PDF file"', async () => {
        const file = resolve(__dirname, 'assets/dummy.pdf');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/pdf-to-html',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          file,
        });

        assert.strictEqual(response.statusCode, 200);
        assert.ok(text.includes('Dummy PDF file'));
        assert.ok(text.toLowerCase().includes('<!doctype html>'));
      });
    });
  });
});
