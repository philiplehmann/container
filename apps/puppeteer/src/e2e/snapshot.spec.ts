import { test, expect } from '@playwright/test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { testRequest } from '@container/test/request';
import { currentArch } from '@container/docker';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const containerPort = 5000;

let container: StartedTestContainer;
let port: number;

[currentArch()].map((arch) => {
  test.beforeAll(async () => {
    container = await new GenericContainer(`philiplehmann/puppeteer:test-${arch}`)
      .withEnvironment({ PORT: String(containerPort) })
      .withExposedPorts(containerPort)
      .withLogConsumer((stream) => stream.pipe(process.stdout))
      .start();

    port = container.getMappedPort(containerPort);
    process.env.BASE_URL = `http://localhost:${port}`;
  });

  test.afterAll(async () => {
    await container.stop();
  });

  test('pdf comparison', async ({ page }) => {
    const [response, text] = await testRequest({
      method: 'POST',
      port,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '<h1>Hello World</h1>' }),
    });

    const path = resolve(__dirname, `${Date.now()}.pdf`);
    try {
      await writeFile(path, text);

      await page.goto(`file://${path}`);
      expect(await page).toHaveScreenshot();
    } finally {
      await unlink(path);
    }
  });
});
