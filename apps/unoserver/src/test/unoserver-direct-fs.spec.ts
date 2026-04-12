import { afterAll, describe, expect, it } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentArch } from '@riwi/docker';
import { useTestContainer } from '@riwi/test/bun';
import { testRequest } from '@riwi/test/request';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const containerPort = 5000;

describe('unoserver', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, async () => {
      describe('/direct-fs', async () => {
        describe('when feature flag is disabled', async () => {
          const setupDisabled = useTestContainer({
            image: `philiplehmann/unoserver:test-${arch}`,
            containerPort,
            env: {
              UNOSERVER_FS_ENABLE: 'false',
              UNOSERVER_DIRECT_ONLY: 'true',
            },
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
                inputPath: 'VorlageBusinessplan.doc',
                outputPath: 'converted/VorlageBusinessplan.pdf',
              }),
            });

            expect(response.statusCode).toBe(404);
          });
        });

        describe('when feature flag is enabled', async () => {
          const inputRoot = resolve(__dirname, 'assets');
          let outputRoot = '';

          afterAll(async () => {
            if (outputRoot) {
              try {
                await rm(outputRoot, { recursive: true, force: true });
              } catch (e) {
                console.error(e);
              }
            }
          });

          const setup = useTestContainer({
            image: `philiplehmann/unoserver:test-${arch}`,
            containerPort,
            env: {
              UNOSERVER_FS_ENABLE: 'true',
              UNOSERVER_DIRECT_ONLY: 'true',
            },
            hook: async (container) => {
              outputRoot = await mkdtemp(resolve(tmpdir(), 'unoserver-out-'));
              execSync(`chmod 777 "${outputRoot}"`);
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
                inputPath: 'VorlageBusinessplan.doc',
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

          it('should reject absolute input path', async () => {
            const [response] = await testRequest({
              method: 'POST',
              host: 'localhost',
              port: setup.port,
              path: '/direct-fs',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                inputPath: '/etc/passwd',
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
                inputPath: 'does-not-exist.doc',
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
