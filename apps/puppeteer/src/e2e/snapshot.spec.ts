import { test, expect } from '@playwright/test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { streamRequest } from '@container/test/request';
import { currentArch, promiseSpawn } from '@container/docker';
import { readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { streamToBuffer } from '@container/stream';

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
  });

  test.afterAll(async () => {
    await container.stop();
  });

  let filePath = '';
  let outputPaths: string[] = [];

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
    const date = String(Date.now());
    const fileName = `${date}.pdf`;
    filePath = resolve(__dirname, 'assets', fileName);

    response.pipe(createWriteStream(filePath), { end: true });

    const imagePath = filePath.replace(/pdf$/, 'png');
    await promiseSpawn('convert', [filePath, imagePath]);
    const files = await readdir(resolve(__dirname, 'assets'));
    outputPaths = files
      .filter((file) => file.endsWith('.png') && file.startsWith(date))
      .map((path) => join(resolve(__dirname, 'assets'), path));
  });

  test.afterEach(async () => {
    await Promise.all(
      [filePath, ...outputPaths].map(async (path) => {
        await unlink(path);
      }),
    );
  });

  test('test pdf visually', async ({ page }) => {
    await Promise.all(
      outputPaths.map(async (imagePath, index) => {
        const buffer = await streamToBuffer(createReadStream(imagePath));
        expect(buffer).toMatchSnapshot({ name: `page-${index}.png`, maxDiffPixelRatio: 0.02 });
      }),
    );
  });
});
