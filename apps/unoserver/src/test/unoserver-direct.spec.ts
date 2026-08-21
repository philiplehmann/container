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
      describe('/direct', async () => {
        const setup = useTestContainer({
          image: `philiplehmann/unoserver:test-${arch}`,
          containerPort,
          hook: (container) => {
            return container.withStartupTimeout(60_000);
          },
          env: {
            UNOSERVER_DIRECT_ONLY: 'true', // Ensure we only test the direct mode
          },
        });

        it('should convert doc to pdf per default', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/direct',
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(9);
        });

        it('should convert doc to pdf with outputFilter', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/direct?outputFilter=writer_pdf_Export',
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(9);
        });

        it('should convert doc to pdf with outputFilter/filterOptions string(SelectPdfVersion)', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('SelectPdfVersion=1')}`,
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(9);
        });

        it('should convert doc to pdf with outputFilter/filterOptions string(PageRange)', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(9);
        });

        it('should convert doc to pdf with outputFilter/filterOptions json(SelectPdfVersion)', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent(
              JSON.stringify({ SelectPdfVersion: { type: 'long', value: 3 } }),
            )}`,
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(9);
        });

        it('should convert doc to pdf with outputFilter/filterOptions json(PageRange)', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent(
              JSON.stringify({ PageRange: { type: 'string', value: '1-2' } }),
            )}`,
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(2);
        });

        it('should convert pptx to pdf with outputFilter/filterOptions json(PageRange)', async () => {
          const file = resolve(__dirname, 'assets/dummy.pptx');
          const [response, pdfBuffer] = await testRequestBuffer({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent(
              JSON.stringify({ PageRange: { type: 'string', value: '3-4' } }),
            )}`,
            file,
          });

          expect(response.statusCode).toBe(200);

          const pages = await getPageCount(pdfBuffer);
          expect(pages).toBe(2);
        });

        it('fails convert docx to pdf per default', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert',
            file,
          });

          expect(response.statusCode).toBe(404);
        });
      });
    });
  });
});
