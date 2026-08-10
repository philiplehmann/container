import { afterEach, describe, expect, it, mock } from 'bun:test';

afterEach(() => {
  mock.restore();
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
});

describe('BrowserToPdfRenderer', () => {
  it('close does not relaunch browser after intentional shutdown', async () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = '/tmp/chromium';

    const disconnectedHandlers: Array<() => void | Promise<void>> = [];
    const fakeBrowser = {
      connected: true,
      process: () => undefined,
      on: (_event: string, handler: () => void | Promise<void>) => {
        disconnectedHandlers.push(handler);
      },
      close: mock(async () => {
        fakeBrowser.connected = false;
        for (const handler of disconnectedHandlers) {
          await handler();
        }
      }),
    };

    const launchMock = mock(async () => fakeBrowser);
    mock.module('puppeteer-core', () => ({
      default: { launch: launchMock },
    }));

    const { BrowserToPdfRenderer } = await import('./render-to');
    const renderer = new BrowserToPdfRenderer();

    await renderer.launch();
    await renderer.close();

    expect(launchMock).toHaveBeenCalledTimes(1);
  });
});
