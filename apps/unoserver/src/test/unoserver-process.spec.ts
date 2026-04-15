import { describe } from 'bun:test';
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
