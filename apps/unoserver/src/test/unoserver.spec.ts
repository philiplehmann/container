import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentArch } from '@container/docker';
import { useTestContainer } from '@container/test/bun';
import { testRequest } from '@container/test/request';

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

        it('should convert docx to pdf with inputFilter/outputFilter/filterOptions', async () => {
          const file = resolve(__dirname, 'assets/dummy.docx');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/convert?inputFilter=${encodeURIComponent('MS Word 2007 XML')}&outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
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

        it('should convert doc to pdf with outputFilter', async () => {
          const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/direct?outputFilter=writer_pdf_Export',
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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

          expect(response.statusCode).toBe(200);
          expect(text.substring(0, 5)).toBe('%PDF-');
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

      describe('/direct-fs', async () => {
        const setupDisabled = useTestContainer({
          image: `philiplehmann/unoserver:test-${arch}`,
          containerPort,
          hook: (container) => {
            return container.withStartupTimeout(60_000);
          },
        });

        it('should return 404 when feature flag is disabled', async () => {
          const [response] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setupDisabled.port,
            path: '/direct-fs',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              inputPath: 'incoming/input.doc',
              outputPath: 'converted/output.pdf',
            }),
          });

          expect(response.statusCode).toBe(404);
        });

        describe('when feature flag is enabled', async () => {
          let inputRoot = '';
          let outputRoot = '';

          beforeAll(async () => {
            inputRoot = await mkdtemp(resolve(tmpdir(), 'unoserver-in-'));
            outputRoot = await mkdtemp(resolve(tmpdir(), 'unoserver-out-'));

            const inputFile = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
            const source = await readFile(inputFile);

            await mkdir(resolve(inputRoot, 'incoming'), { recursive: true });
            await writeFile(resolve(inputRoot, 'incoming/VorlageBusinessplan.doc'), source, { flush: true });
          });

          afterAll(async () => {
            if (inputRoot) {
              await rm(inputRoot, { recursive: true, force: true });
            }
            if (outputRoot) {
              await rm(outputRoot, { recursive: true, force: true });
            }
          });

          const setup = useTestContainer({
            image: `philiplehmann/unoserver:test-${arch}`,
            containerPort,
            env: {
              ENABLE_FILESYSTEM_PROCESSING_ACCESS: 'true',
              UNOSERVER_DIRECT_ONLY: 'true',
            },
            hook: (container) => {
              return container.withStartupTimeout(60_000).withBindMounts([
                { source: inputRoot, target: '/data/in' },
                { source: outputRoot, target: '/data/out' },
              ]);
            },
            timeout: 90_000,
          });

          it('should convert file from FS input root to FS output root', async () => {
            const [response, text] = await testRequest({
              method: 'POST',
              host: 'localhost',
              port: setup.port,
              path: '/direct-fs',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                inputPath: 'incoming/VorlageBusinessplan.doc',
                outputPath: 'converted/VorlageBusinessplan.pdf',
                convertTo: 'pdf',
              }),
            });

            expect(response.statusCode).toBe(200);
            interface DirectFsResponse {
              status: string;
              inputPath: string;
              outputPath: string;
              outputBytes: number;
              durationMs: number;
            }
            const json = JSON.parse(text) as DirectFsResponse;
            expect(json.status).toBe('complete');
            expect(json.outputPath).toBe('converted/VorlageBusinessplan.pdf');
            expect(json.outputBytes).toBeGreaterThan(0);
          });

          it('should reject path traversal', async () => {
            const [response] = await testRequest({
              method: 'POST',
              host: 'localhost',
              port: setup.port,
              path: '/direct-fs',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                inputPath: '../outside.doc',
                outputPath: 'converted/out.pdf',
                convertTo: 'pdf',
              }),
            });

            expect(response.statusCode).toBe(400);
          });

          it('should reject missing input file', async () => {
            const [response, text] = await testRequest({
              method: 'POST',
              host: 'localhost',
              port: setup.port,
              path: '/direct-fs',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                inputPath: 'incoming/does-not-exist.doc',
                outputPath: 'converted/out.pdf',
                convertTo: 'pdf',
              }),
            });

            expect(response.statusCode).toBe(400);
            const json = JSON.parse(text) as { status: string; message: string };
            expect(json.status).toBe('error');
            expect(json.message).toContain('Input file not found or not readable');
          });
        });
      });
    });
  });
});
