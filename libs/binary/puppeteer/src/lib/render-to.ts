import { join } from 'node:path';
import { cwd } from 'node:process';
import puppeteer, { type Browser } from 'puppeteer-core';
import type { output } from 'zod/v4';
import type { bodySchema } from './body-schema';
import { ScreenshotType } from './screenshot-type';

export class BrowserToPdfRenderer {
  private launchedBrowser?: Browser;
  private isClosing = false;
  private recoveringBrowser?: Promise<Browser>;
  private recoveringFromBrowser?: Browser;
  private readonly disconnectHandlerBrowsers = new WeakSet<Browser>();

  private recoverBrowser(
    disconnectedBrowser: Browser,
    timeout: number,
    { reuseInFlight = true }: { reuseInFlight?: boolean } = {},
  ): Promise<Browser> {
    if (reuseInFlight && this.recoveringBrowser && this.recoveringFromBrowser === disconnectedBrowser) {
      return this.recoveringBrowser;
    }

    const recovery = (async () => {
      if (this.isClosing) {
        return disconnectedBrowser;
      }
      await this.cleanup(disconnectedBrowser);
      if (this.isClosing) {
        return disconnectedBrowser;
      }
      return this.browser({ timeout, reuseRecovery: false });
    })();

    this.recoveringBrowser = recovery;
    this.recoveringFromBrowser = disconnectedBrowser;

    recovery.finally(() => {
      if (this.recoveringBrowser === recovery) {
        this.recoveringBrowser = undefined;
        this.recoveringFromBrowser = undefined;
      }
    });

    return recovery;
  }

  private async browser({
    timeout = 60_000,
    reuseRecovery = true,
  }: {
    timeout?: number;
    reuseRecovery?: boolean;
  } = {}): Promise<Browser> {
    if (!this.launchedBrowser) {
      if (process.env.PUPPETEER_EXECUTABLE_PATH === undefined) {
        throw new Error('PUPPETEER_EXECUTABLE_PATH is required');
      }
      this.launchedBrowser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: true,
        userDataDir: join(cwd(), 'chromium-data'),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--enable-font-antialiasing',
          '--font-render-hinting=none',
          '--disable-dev-shm-usage',
          '--disable-features=PushMessaging',
        ],
        timeout,
      });
      this.launchedBrowser.process()?.stdout?.pipe(process.stdout);
      this.launchedBrowser.process()?.stderr?.pipe(process.stderr);
    }

    const activeBrowser = this.launchedBrowser;
    if (!this.disconnectHandlerBrowsers.has(activeBrowser)) {
      this.disconnectHandlerBrowsers.add(activeBrowser);
      activeBrowser.on('disconnected', () => {
        this.recoverBrowser(activeBrowser, timeout).catch((error: unknown) => {
          const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
          process.stderr.write(`${message}\n`);
        });
      });
    }

    if (!activeBrowser.connected) {
      return this.recoverBrowser(activeBrowser, timeout, { reuseInFlight: reuseRecovery }).catch((error: unknown) => {
        const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
        process.stderr.write(`${message}\n`);
        throw error;
      });
    }
    return activeBrowser;
  }

  public async launch(): Promise<void> {
    await this.browser();
  }

  public async close(): Promise<void> {
    this.isClosing = true;
    try {
      await this.recoveringBrowser?.catch(() => {});
      await this.cleanup(this.launchedBrowser);
      await this.recoveringBrowser?.catch(() => {});
    } finally {
      this.isClosing = false;
    }
  }

  private async cleanup(browser = this.launchedBrowser): Promise<void> {
    await browser?.close().catch(() => {});
    if (browser && this.launchedBrowser === browser) {
      this.launchedBrowser = undefined;
    }
  }

  public async renderTo(
    schema: output<typeof bodySchema>,
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
