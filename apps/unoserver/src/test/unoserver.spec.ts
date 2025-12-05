import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { useTestContainer } from '@container/test/server';

const containerPort = 5000;

describe('unoserver', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, async () => {
      describe('/convert', async () => {
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
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert docx to pdf with inputFilter/outputFilter/filterOptions', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/convert?inputFilter=${encodeURIComponent('MS Word 2007 XML')}&outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert docx to pdf with updateIndex', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?updateIndex=true',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert docx to pdf with dontUpdateIndex', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?dontUpdateIndex=true',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert docx to pdf with verbose', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?verbose=true',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert docx to pdf with quiet', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?quiet=true',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert docx to pdf with convertTo', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?convertTo=pdf',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert docx to png with convertTo', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?convertTo=png',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(response.headers['content-type'], 'image/png');
        });

        it('should convert docx to jpeg with convertTo', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?convertTo=jpeg',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(response.headers['content-type'], 'image/jpeg');
        });
      });

      describe('/direct', async () => {
        const setup = await useTestContainer({
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
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/direct',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert doc to pdf with outputFilter', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/direct?outputFilter=writer_pdf_Export',
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert doc to pdf with outputFilter/filterOptions string(SelectPdfVersion)', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('SelectPdfVersion=1')}`,
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert doc to pdf with outputFilter/filterOptions string(PageRange)', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert doc to pdf with outputFilter/filterOptions json(SelectPdfVersion)', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent(
              JSON.stringify({ SelectPdfVersion: { type: 'long', value: 3 } }),
            )}`,
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
        });

        it('should convert doc to pdf with outputFilter/filterOptions json(PageRange)', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent(
              JSON.stringify({ PageRange: { type: 'string', value: '1-2' } }),
            )}`,
            file,
          });

          assert.strictEqual(response.statusCode, 200);
          assert.strictEqual(text.substring(0, 5), '%PDF-');
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

          assert.strictEqual(response.statusCode, 404);
        });
      });
    });
  });
});
