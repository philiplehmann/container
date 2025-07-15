import { resolve } from 'node:path';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { useTestContainer } from '@container/test/server';
import { describe, expect, it } from 'vitest';

const containerPort = 5000;

describe('unoserver', () => {
  [currentArch()].map((arch) => {
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

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
        });

        it('should convert docx to pdf with inputFilter/outputFilter/filterOptions', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/convert?inputFilter=MS%20Word%202007%20XML&outputFilter=writer_pdf_Export&filterOptions=PageRange=1-2',
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toBe('image/jpeg');
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

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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
