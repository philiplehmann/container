import puppeteer from 'puppeteer-core';
import type { TypeOf } from 'zod';
import type { bodySchema } from './body-schema';
import { ScreenshotType } from './screenshot-type';

export const renderTo = async (
  schema: TypeOf<typeof bodySchema>,
  { type, imageType = ScreenshotType.png }: { type: 'pdf' | 'image'; imageType?: ScreenshotType },
) => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH === undefined) {
    throw new Error('PUPPETEER_EXECUTABLE_PATH is required');
  }
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    userDataDir: './chromium-data',
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const { url, html, ...props } = {
      url: null,
      html: null,
      ...schema,
    };
    if (typeof url === 'string') {
      await page.goto(url);
      await page.waitForNetworkIdle({ idleTime: 1_000, timeout: 5_000 });
    } else if (typeof html === 'string') {
      await page.setContent(html);
    } else {
      throw new Error('url or html is required');
    }

    if (type === 'image') return await page.screenshot({ ...props, type: imageType });
    if (type === 'pdf') return await page.pdf(props);

    throw new Error(`wrong type: ${type}`);
  } finally {
    await browser.close();
  }
};
