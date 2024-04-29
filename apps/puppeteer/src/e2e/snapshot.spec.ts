import { test, expect } from '@playwright/test';
import { GenericContainer, type StartedTestContainer, Network, type StartedNetwork } from 'testcontainers';
import { streamRequest, testRequest } from '@container/test/request';
import { currentArch } from '@container/docker';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createWriteStream } from 'node:fs';

const containerPort = 5000;

let container: StartedTestContainer;
let nginx: StartedTestContainer;
let port: number;
let nginxPort: number;

[currentArch()].map((arch) => {
  test.beforeAll(async () => {
    container = await new GenericContainer(`philiplehmann/puppeteer:test-${arch}`)
      .withEnvironment({ PORT: String(containerPort) })
      .withExposedPorts(containerPort)
      .withLogConsumer((stream) => stream.pipe(process.stdout))
      .start();
    nginx = await new GenericContainer('nginx')
      .withExposedPorts(80)
      .withLogConsumer((stream) => stream.pipe(process.stdout))
      .withBindMounts([{ source: resolve(__dirname, 'assets'), target: '/usr/share/nginx/html' }])
      .start();

    port = container.getMappedPort(containerPort);
    nginxPort = nginx.getMappedPort(80);
    process.env.BASE_URL = `http://localhost:${nginxPort}`;
  });

  test.afterAll(async () => {
    await container.stop();
    await nginx.stop();
  });

  let numberOfPages = 0;
  let fileName = '';

  test.beforeEach(async ({ page, browserName }) => {
    const response = await streamRequest({
      method: 'POST',
      port,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://cv.philiplehmann.ch',
        format: 'a4',
        landscape: false,
        scale: 0.8,
        printBackground: true,
        omitBackground: true,
        pageRanges: '1-3',
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      }),
    });
    fileName = `${Date.now()}.pdf`;
    const path = resolve(__dirname, 'assets', fileName);

    response.pipe(createWriteStream(path), { end: true });

    await page.goto(`http://localhost:${nginxPort}/pdf.html?file=${encodeURIComponent(fileName)}`);
    await page.waitForFunction(() => typeof print === 'object');
    numberOfPages = await page.evaluate(async () => print.numPages);
  });

  test.afterEach(async () => {
    await unlink(resolve(__dirname, 'assets', fileName));
  });

  test('test pdf visually', async ({ page }) => {
    test.setTimeout(120000);
    const theCanvas = page.locator('#the-canvas');
    for (let i = 0; i < numberOfPages; i++) {
      expect(await theCanvas.screenshot()).toMatchSnapshot({ name: `page-${i}.png` });
      await page.evaluate(() => print.nextPage());
    }
  });
});
