import { afterAll, describe } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentArch } from '@riwi/docker';
import { createProcessEndpointsDisabledTest, createProcessEndpointTests, useTestContainer } from '@riwi/test/bun';
import { testRequest } from '@riwi/test/request';

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
          env: { UNOSERVER_PROCESS_ENABLED: 'true' },
          hook: (container) => {
            return container.withStartupTimeout(60_000);
          },
          timeout: 90_000,
        });

        describe('process management', () => {
          createProcessEndpointTests(
            () => setup.port,
            async (port) => {
              const file = resolve(__dirname, 'assets/dummy.docx');
              await testRequest({
                method: 'POST',
                host: 'localhost',
                port,
                path: '/convert',
                file,
              });
            },
          );
        });
      });

      describe('/direct', async () => {
        const setup = useTestContainer({
          image: `philiplehmann/unoserver:test-${arch}`,
          containerPort,
          env: {
            UNOSERVER_PROCESS_ENABLED: 'true',
            UNOSERVER_DIRECT_ONLY: 'true',
          },
          hook: (container) => {
            return container.withStartupTimeout(60_000);
          },
          timeout: 90_000,
        });

        describe('process management', () => {
          createProcessEndpointTests(
            () => setup.port,
            async (port) => {
              const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
              await testRequest({
                method: 'POST',
                host: 'localhost',
                port,
                path: '/direct',
                file,
              });
            },
            {
              triggerFailingProcess: async (port) => {
                const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
                await testRequest({
                  method: 'POST',
                  host: 'localhost',
                  port,
                  path: '/direct?outputFilter=invalid_filter_name',
                  file,
                });
              },
              triggerTimeoutProcess: async (port) => {
                const file = resolve(__dirname, 'assets/VorlageBusinessplan.doc');
                await testRequest({
                  method: 'POST',
                  host: 'localhost',
                  port,
                  path: '/direct?timeoutMs=1',
                  file,
                });
              },
            },
          );
        });
      });

      describe('/direct-fs', async () => {
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
            UNOSERVER_PROCESS_ENABLED: 'true',
            UNOSERVER_DIRECT_ONLY: 'true',
            UNOSERVER_FS_ENABLE: 'true',
          },
          hook: async (container) => {
            outputRoot = await mkdtemp(resolve(tmpdir(), 'unoserver-process-out-'));
            execSync(`chmod 777 "${outputRoot}"`);
            return container.withStartupTimeout(60_000).withBindMounts([
              { source: inputRoot, target: '/data/in' },
              { source: outputRoot, target: '/data/out' },
            ]);
          },
          timeout: 90_000,
        });

        describe('process management', () => {
          createProcessEndpointTests(
            () => setup.port,
            async (port) => {
              await testRequest({
                method: 'POST',
                host: 'localhost',
                port,
                path: '/direct-fs',
                headers: {
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  inputPath: 'VorlageBusinessplan.doc',
                  outputPath: `converted/success-${Date.now()}.pdf`,
                  convertTo: 'pdf',
                }),
              });
            },
            {
              triggerFailingProcess: async (port) => {
                await testRequest({
                  method: 'POST',
                  host: 'localhost',
                  port,
                  path: '/direct-fs',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    inputPath: 'VorlageBusinessplan.doc',
                    outputPath: `converted/failed-${Date.now()}.pdf`,
                    convertTo: 'pdf',
                    outputFilter: 'invalid_filter_name',
                  }),
                });
              },
            },
          );
        });
      });

      describe('process endpoints disabled', async () => {
        const setup = useTestContainer({
          image: `philiplehmann/unoserver:test-${arch}`,
          containerPort,
          hook: (container) => {
            return container.withStartupTimeout(60_000);
          },
          timeout: 90_000,
        });

        createProcessEndpointsDisabledTest(() => setup.port);
      });
    });
  });
});
