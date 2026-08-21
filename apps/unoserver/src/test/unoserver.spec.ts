import { describe, expect, it } from 'bun:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentArch } from '@riwi/docker';
import { useTestContainer } from '@riwi/test/bun';
import { testRequest, testRequestBuffer } from '@riwi/test/request';
import { getPageCount } from './getPageCount';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const containerPort = 5000;

describe('unoserver', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, async () => {
      describe('/convert', async () => {
        const setup = useTestContainer({
          image: `philiplehmann/unoserver:test-${arch}`,
          containerPort,
          hook: (container) => {
            return container.withStartupTimeout(60_000);
          },
          timeout: 90_000,
        });

        it('should convert docx to pdf per default', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert',
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
        });

        it('should convert pptx to pdf per default', async () => {
          const file = resolve(__dirname, 'assets/dummy.pptx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert',
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(10);
        });

        it('should convert docx to pdf with inputFilter/outputFilter/filterOptions', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/convert?inputFilter=${encodeURIComponent('MS Word 2007 XML')}&outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(1);
        });

        it('should convert pptx to pdf with inputFilter/outputFilter/filterOptions', async () => {
          const file = resolve(__dirname, 'assets/dummy.pptx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/convert?outputFilter=impress_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(2);
        });

        it('should convert docx to pdf with updateIndex', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?updateIndex=true',
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(1);
        });

        it('should convert docx to pdf with dontUpdateIndex', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?dontUpdateIndex=true',
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(1);
        });

        it('should convert docx to pdf with verbose', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?verbose=true',
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(1);
        });

        it('should convert docx to pdf with quiet', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?quiet=true',
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(1);
        });

        it('should convert docx to pdf with convertTo', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?convertTo=pdf',
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(1);
        });

        it('should convert docx to png with convertTo', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, _text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?convertTo=png',
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toBe('image/png');
        });

        it('should convert docx to jpeg with convertTo', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, _text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?convertTo=jpeg',
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toBe('image/jpeg');
        });
      });
    });
  });
});
