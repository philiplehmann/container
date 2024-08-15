import { resolve } from 'node:path';
import { testRequest } from '@container/test/request';
import { describe, it, expect } from 'vitest';
import { useTestContainer } from '@container/test/server';
import { currentArch } from '@container/docker';

const containerPort = 5000;

describe('unoserver', () => {
  [currentArch()].map((arch) => {
    describe(`arch: ${arch}`, async () => {
      const setup = await useTestContainer({
        image: `philiplehmann/unoserver:test-${arch}`,
        containerPort,
        hook: (container) => {
          return container.withStartupTimeout(60_000);
        },
      });

      it('should convert docx to pdf per default', async () => {
        const file = resolve(__dirname, 'assets/dummy.docx');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/convert',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(text.substring(0, 5)).toBe('%PDF-');
      });

      it('should convert docx to pdf with convertTo', async () => {
        const file = resolve(__dirname, 'assets/dummy.docx');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/convert?convertTo=pdf',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(text.substring(0, 5)).toBe('%PDF-');
      });

      it('should convert docx to png with convertTo', async () => {
        const file = resolve(__dirname, 'assets/dummy.docx');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/convert?convertTo=png',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('image/png');
      });

      it('should convert docx to jpeg with convertTo', async () => {
        const file = resolve(__dirname, 'assets/dummy.docx');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/convert?convertTo=jpeg',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('image/jpeg');
      });
    });
  });
});
