import { resolve } from 'node:path';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { useTestContainer } from '@container/test/server';
import { describe, expect, it } from 'vitest';

const containerPort = 5000;

describe('poppler', () => {
  [currentArch()].map((arch) => {
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
        expect(text).toContain('Dummy PDF file');
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
        expect(text).toContain('Dummy PDF file');
        expect(text.toLowerCase()).toContain('<!doctype html>');
      });
    });
  });
});
