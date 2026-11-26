// Port of apps/unoserver/src/test/unoserver.spec.ts to the versioned API.
import { describe, expect, it } from 'bun:test';
import { currentArch } from '@riwi/docker';
import { useTestContainer } from '@riwi/test/bun';
import { testRequest, testRequestBuffer } from '@riwi/test/request';
import { asset, containerPort, getPageCount, image } from './helpers';

describe('office-pdf', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, () => {
      describe('/v1/convert', () => {
        const setup = useTestContainer({
          image: image(arch),
          containerPort,
          hook: (container) => container.withStartupTimeout(30_000),
        });

        const convert = (path: string, file: string) =>
          testRequestBuffer({ method: 'POST', host: 'localhost', port: setup.port, path, file: asset(file) });

        it('should convert docx to pdf per default', async () => {
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/v1/convert',
            file: asset('dummy.docx'),
          });

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
        });

        it('should convert pptx to pdf per default', async () => {
          const [response, pdf] = await convert('/v1/convert', 'dummy.pptx');

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(10);
        });

        it('should convert docx to pdf with inputFilter/outputFilter/filterOptions', async () => {
          const [response, pdf] = await convert(
            `/v1/convert?inputFilter=${encodeURIComponent('MS Word 2007 XML')}&outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
            'dummy.docx',
          );

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(1);
        });

        it('should convert pptx to pdf with inputFilter/outputFilter/filterOptions', async () => {
          const [response, pdf] = await convert(
            `/v1/convert?outputFilter=impress_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
            'dummy.pptx',
          );

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(2);
        });

        for (const flag of ['updateIndex', 'dontUpdateIndex', 'verbose', 'quiet']) {
          it(`should convert docx to pdf with ${flag}`, async () => {
            const [response, pdf] = await convert(`/v1/convert?${flag}=true`, 'dummy.docx');

            expect(response.statusCode).toBe(200);
            expect(await getPageCount(pdf)).toBe(1);
          });
        }

        it('should convert docx to pdf with convertTo', async () => {
          const [response, pdf] = await convert('/v1/convert?convertTo=pdf', 'dummy.docx');

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(1);
        });

        for (const [convertTo, mime] of [
          ['png', 'image/png'],
          ['jpeg', 'image/jpeg'],
          ['webp', 'image/webp'],
        ]) {
          it(`should convert docx to ${convertTo} with convertTo`, async () => {
            const [response] = await convert(`/v1/convert?convertTo=${convertTo}`, 'dummy.docx');

            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toBe(mime);
          });
        }

        it('should reject an unsupported format', async () => {
          const [response] = await convert('/v1/convert?format=exe', 'dummy.docx');

          expect(response.statusCode).toBe(415);
        });

        it('should serve the openapi document', async () => {
          const response = await fetch(`http://localhost:${setup.port}/v1/openapi.json`);

          expect(response.status).toBe(200);
          const doc = (await response.json()) as { openapi: string; paths: Record<string, unknown> };
          expect(doc.openapi).toBe('3.1.0');
          expect(Object.keys(doc.paths)).toContain('/v1/convert');
        });
      });
    });
  });
});
