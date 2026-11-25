// Port of apps/poppler/src/test/poppler.spec.ts to the versioned API. The process endpoints are
// always available (poppler needs POPPLER_PROCESS_ENABLED=true).
import { describe, expect, it } from 'bun:test';
import { currentArch } from '@riwi/docker';
import { createProcessEndpointTests, useTestContainer } from '@riwi/test/bun';
import { testRequest, testRequestBuffer } from '@riwi/test/request';
import { asset, containerPort, image } from './helpers';

describe('office-pdf', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch} - poppler`, () => {
      const setup = useTestContainer({
        image: image(arch),
        containerPort,
        hook: (container) => container.withStartupTimeout(30_000),
      });

      it('should convert PDF to text', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/v1/pdf-to-text',
          headers: { 'Content-Type': 'application/pdf' },
          file: asset('dummy.pdf'),
        });

        expect(response.statusCode).toBe(200);
        expect(text.includes('Dummy PDF file')).toBeTruthy();
      });

      it('should convert PDF to HTML and include "Dummy PDF file"', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/v1/pdf-to-html',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          file: asset('dummy.pdf'),
        });

        expect(response.statusCode).toBe(200);
        expect(text.includes('Dummy PDF file')).toBeTruthy();
        expect(text.toLowerCase().includes('<!doctype html>')).toBeTruthy();
      });

      it('should render a PDF page as PNG', async () => {
        const [response, png] = await testRequestBuffer({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/v1/pdf-to-image?dpi=72',
          file: asset('dummy.pdf'),
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('image/png');
        expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
      });

      describe('process management', () => {
        createProcessEndpointTests(
          () => setup.port,
          async (port) => {
            await testRequest({
              method: 'POST',
              host: 'localhost',
              port,
              path: '/v1/pdf-to-text',
              headers: { 'Content-Type': 'application/pdf' },
              file: asset('dummy.pdf'),
            });
          },
          { basePath: '/v1' },
        );
      });
    });
  });
});
