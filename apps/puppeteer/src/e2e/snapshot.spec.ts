import { test, expect } from '@playwright/test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { streamRequest } from '@container/test/request';
import { currentArch, promiseSpawn } from '@container/docker';
import { readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { streamToBuffer } from '@container/stream';
import { finished } from 'node:stream/promises';
import { execSync } from 'node:child_process';

const containerPort = 5000;

const imageMagickConvert = async (input: string, output: string) => {
  const whichOutput = (() => {
    try {
      return execSync('which magick').toString().trim();
    } catch {
      return null;
    }
  })();
  if (whichOutput && existsSync(whichOutput)) {
    await promiseSpawn('magick', [input, output]);
  } else {
    await promiseSpawn('convert', [input, output]);
  }
};

let container: StartedTestContainer;
let port: number;

[currentArch()].map((arch) => {
  test.beforeAll(async () => {
    if (process.env.TEST_SERVER_RUNNER === 'local') {
      port = 3000;
    } else {
      container = await new GenericContainer(`philiplehmann/puppeteer:test-${arch}`)
        .withEnvironment({ PORT: String(containerPort) })
        .withExposedPorts(containerPort)
        .withLogConsumer((stream) => stream.pipe(process.stdout))
        .start();

      port = container.getMappedPort(containerPort);
    }
  });

  test.setTimeout(60_000);

  test.afterAll(async () => {
    if (process.env.TEST_SERVER_RUNNER !== 'local') {
      await container.stop();
    }
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
    expect(response.statusCode).toBe(200);

    const date = String(Date.now());
    const fileName = `${date}.pdf`;
    filePath = resolve(__dirname, 'assets', fileName);

    await finished(response.pipe(createWriteStream(filePath)));

    const imagePath = filePath.replace(/pdf$/, 'png');
    await imageMagickConvert(filePath, imagePath);
    const files = await readdir(resolve(__dirname, 'assets'));
    outputPaths = files
      .filter((file) => file.endsWith('.png') && file.startsWith(date))
      .map((path) => join(resolve(__dirname, 'assets'), path));
  });

  test.afterEach(async () => {
    await Promise.all(
      [filePath, ...outputPaths].map(async (path) => {
        if (existsSync(path)) {
          await unlink(path);
        }
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
