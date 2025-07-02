import { execSync } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { finished } from 'node:stream/promises';
import { currentArch, promiseSpawn } from '@container/docker';
import { streamToBuffer } from '@container/stream';
import { streamRequest } from '@container/test/request';
import { testContainer } from '@container/test/server';
import { expect, test } from '@playwright/test';
import type { StartedTestContainer } from 'testcontainers';
import type { TypeOf } from 'zod';
import type { bodySchema } from '@container/binary/puppeteer';
import { randomUUID } from 'node:crypto';

const containerPort = 5000;

const pdfToPngConvert = async (input: string, output: string) => {
  const whichOutput = (() => {
    try {
      return execSync('which pdftoppm').toString().trim();
    } catch {
      return null;
    }
  })();

  if (whichOutput && existsSync(whichOutput)) {
    // Remove the .png extension from output to get the base name
    const outputBase = output.replace(/\.png$/, '');

    // pdftoppm arguments for high-quality PNG output
    const args = [
      '-png', // Output PNG format
      '-r',
      '300', // Resolution: 300 DPI for high quality
      input, // Input PDF file
      outputBase, // Output base name (pdftoppm will add page numbers)
    ];

    await promiseSpawn('pdftoppm', args);
  } else {
    throw new Error(`pdftoppm not found, please install poppler to convert PDF to PNG. Output: ${whichOutput}`);
  }
};

let container: StartedTestContainer;
let port: number;

const streamPdf = async (body: TypeOf<typeof bodySchema>): Promise<[string, string[]]> => {
  const response = await streamRequest({
    method: 'POST',
    port,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(response.statusCode).toBe(200);

  const date = randomUUID();
  const fileName = `${date}.pdf`;
  const filePath = resolve(__dirname, 'assets', fileName);

  await finished(response.pipe(createWriteStream(filePath)));

  const imagePath = filePath.replace(/pdf$/, 'png');
  await pdfToPngConvert(filePath, imagePath);
  const files = await readdir(resolve(__dirname, 'assets'));
  const outputPaths = files
    .filter((file) => file.endsWith('.png') && file.startsWith(date))
    .map((path) => join(resolve(__dirname, 'assets'), path));
  return [filePath, outputPaths] as const;
};

test.setTimeout(60_000);
[currentArch()].map((arch) => {
  test.describe(`arch: ${arch}`, () => {
    test.beforeAll(async () => {
      if (process.env.TEST_SERVER_RUNNER === 'local') {
        port = 3000;
      } else {
        [container, port] = await testContainer({ image: `philiplehmann/puppeteer:test-${arch}`, containerPort });
      }
    });

    test.afterAll(async () => {
      if (process.env.TEST_SERVER_RUNNER !== 'local') {
        await container?.stop();
      }
    });

    let filePath = '';
    let outputPaths: string[] = [];

    test.afterEach(async () => {
      await Promise.all(
        [filePath, ...outputPaths].map(async (path) => {
          if (existsSync(path)) {
            await unlink(path);
          }
        }),
      );
      filePath = '';
      outputPaths = [];
    });

    test('test pdf visually', async ({ page }, testinfo) => {
      testinfo.snapshotSuffix = '';
      [filePath, outputPaths] = await streamPdf({
        url: 'https://cv.philiplehmann.ch',
        format: 'a4',
        landscape: false,
        scale: 0.8,
        printBackground: true,
        omitBackground: true,
        pageRanges: '1-3',
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      expect(outputPaths.length).toBe(4);
      await Promise.all(
        outputPaths.map(async (imagePath, index) => {
          const buffer = await streamToBuffer(createReadStream(imagePath));
          expect(buffer).toMatchSnapshot({ name: `page-${index}.png`, maxDiffPixelRatio: 0.02 });
        }),
      );
    });

    test('paint background red', async ({ page }, testinfo) => {
      testinfo.snapshotSuffix = '';
      [filePath, outputPaths] = await streamPdf({
        url: 'https://cv.philiplehmann.ch',
        format: 'a4',
        landscape: false,
        scale: 0.8,
        printBackground: true,
        omitBackground: true,
        pageRanges: '1-3',
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        pageEvaluate: (() => {
          for (const el of Array.from(document.querySelectorAll('.MuiBox-root.mui-1ym1srf'))) {
            (el as HTMLElement).style.backgroundColor = 'red';
          }
        }).toString(),
      });
      expect(outputPaths.length).toBe(4);
      await Promise.all(
        outputPaths.map(async (imagePath, index) => {
          const buffer = await streamToBuffer(createReadStream(imagePath));
          expect(buffer).toMatchSnapshot({ name: `page-${index}.png`, maxDiffPixelRatio: 0.02 });
        }),
      );
    });
  });
});
