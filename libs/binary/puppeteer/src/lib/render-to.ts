import puppeteer, { type Browser } from 'puppeteer-core';
import type { TypeOf } from 'zod';
import type { bodySchema } from './body-schema';
import { ScreenshotType } from './screenshot-type';
import { join } from 'node:path';
import { cwd } from 'node:process';

export class BrowserToPdfRenderer {
  private launchedBrowser?: Browser;
  private async browser(): Promise<Browser> {
    if (!this.launchedBrowser) {
      if (process.env.PUPPETEER_EXECUTABLE_PATH === undefined) {
        throw new Error('PUPPETEER_EXECUTABLE_PATH is required');
      }
      this.launchedBrowser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: true,
        userDataDir: join(cwd(), 'chromium-data'),
        args: ['--no-sandbox', '--disable-gpu', '--enable-font-antialiasing', '--font-render-hinting=none'],
      });
      this.launchedBrowser.process()?.stdout?.pipe(process.stdout);
      this.launchedBrowser.process()?.stderr?.pipe(process.stderr);
    }
    return this.launchedBrowser;
  }

  public async launch(): Promise<void> {
    await this.browser();
  }

  public async close(): Promise<void> {
    if (this.launchedBrowser) {
      await this.launchedBrowser.close();
    }
  }

  public async renderTo(
    schema: TypeOf<typeof bodySchema>,
    { type, imageType = ScreenshotType.png }: { type: 'pdf' | 'image'; imageType?: ScreenshotType },
  ) {
    const browser = await this.browser();
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    try {
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
      await context.close();
    }
  }
}
