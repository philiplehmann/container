import { describe, expect, it } from 'bun:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentArch } from '@container/docker';
import { useTestContainer } from '@container/test/bun';
import { testRequest } from '@container/test/request';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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

        expect(response.statusCode).toBe(200);
        expect(text.includes('Dummy PDF file')).toBeTruthy();
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

        expect(response.statusCode).toBe(200);
        expect(text.includes('Dummy PDF file')).toBeTruthy();
        expect(text.toLowerCase().includes('<!doctype html>')).toBeTruthy();
      });
    });
  });
});
