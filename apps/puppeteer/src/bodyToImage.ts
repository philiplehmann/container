import puppeteer from 'puppeteer';
import type { TypeOf } from 'zod';
import type { schema } from './schema';

export const bodyToImage = async (bodySchema: TypeOf<typeof schema>) => {
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: './chromium-data',
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const { url, html, ...props } = {
      url: null,
      html: null,
      ...bodySchema,
    };
    if (typeof url === 'string') {
      await page.goto(url);
      await page.waitForNetworkIdle({ idleTime: 1_000, timeout: 5_000 });
    } else if (typeof html === 'string') {
      await page.setContent(html);
    } else {
      throw new Error('url or html is required');
    }

    const body = await page.screenshot(props);
    return { statusCode: 200, contentType: 'application/pdf', body };
  } finally {
    await browser.close();
  }
};
