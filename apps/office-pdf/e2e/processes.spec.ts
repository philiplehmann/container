// Port of apps/unoserver/src/test/unoserver-process.spec.ts to the versioned API. The process
// endpoints are always available (unoserver needs UNOSERVER_PROCESS_ENABLED=true); a "process" is
// a conversion job of the server.
import { afterAll, describe } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { currentArch } from '@riwi/docker';
import { createProcessEndpointTests, useTestContainer } from '@riwi/test/bun';
import { testRequest } from '@riwi/test/request';
import { asset, assets, containerPort, image } from './helpers';

const basePath = '/v1';

describe('office-pdf', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, () => {
      describe('/v1/convert', () => {
        const setup = useTestContainer({
          image: image(arch),
          containerPort,
          hook: (container) => container.withStartupTimeout(30_000),
        });

        describe('process management', () => {
          createProcessEndpointTests(
            () => setup.port,
            async (port) => {
              await testRequest({
                method: 'POST',
                host: 'localhost',
                port,
                path: '/v1/convert',
                file: asset('dummy.docx'),
              });
            },
            { basePath },
          );
        });
      });

      describe('/v1/direct', () => {
        const setup = useTestContainer({
          image: image(arch),
          containerPort,
          hook: (container) => container.withStartupTimeout(30_000),
        });

        const direct = (port: number, path: string) =>
          testRequest({ method: 'POST', host: 'localhost', port, path, file: asset('VorlageBusinessplan.doc') });

        describe('process management', () => {
          createProcessEndpointTests(
            () => setup.port,
            async (port) => {
              await direct(port, '/v1/direct');
            },
            {
              basePath,
              triggerFailingProcess: async (port) => {
                await direct(port, '/v1/direct?outputFilter=invalid_filter_name');
              },
              triggerTimeoutProcess: async (port) => {
                await direct(port, '/v1/direct?timeoutMs=1');
              },
            },
          );
        });
      });

      describe('/v1/direct-fs', () => {
        let outputRoot = '';

        afterAll(async () => {
          if (outputRoot) {
            await rm(outputRoot, { recursive: true, force: true }).catch(console.error);
          }
        });

        const setup = useTestContainer({
          image: image(arch),
          containerPort,
          hook: async (container) => {
            outputRoot = await mkdtemp(resolve(tmpdir(), 'office-pdf-process-out-'));
            execSync(`chmod 777 "${outputRoot}"`);
            return container.withStartupTimeout(30_000).withBindMounts([
              { source: assets, target: '/data/in' },
              { source: outputRoot, target: '/data/out' },
            ]);
          },
          timeout: 60_000,
        });

        const directFs = (port: number, body: Record<string, unknown>) =>
          testRequest({
            method: 'POST',
            host: 'localhost',
            port,
            path: '/v1/direct-fs',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });

        describe('process management', () => {
          createProcessEndpointTests(
            () => setup.port,
            async (port) => {
              await directFs(port, {
                inputPath: 'VorlageBusinessplan.doc',
                outputPath: `converted/success-${Date.now()}.pdf`,
                convertTo: 'pdf',
              });
            },
            {
              basePath,
              triggerFailingProcess: async (port) => {
                await directFs(port, {
                  inputPath: 'VorlageBusinessplan.doc',
                  outputPath: `converted/failed-${Date.now()}.pdf`,
                  convertTo: 'pdf',
                  outputFilter: 'invalid_filter_name',
                });
              },
            },
          );
        });
      });
    });
  });
});
