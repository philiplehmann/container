import { afterEach, describe, expect, it, mock } from 'bun:test';

afterEach(() => {
  mock.restore();
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
});

describe('BrowserToPdfRenderer', () => {
  it('uses one disconnect handler, serializes recovery, and does not relaunch on close', async () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = '/tmp/chromium';

    const disconnectedHandlers: Array<() => void | Promise<void>> = [];
    const firstBrowser = {
      connected: true,
      process: () => undefined,
      on: (_event: string, handler: () => void | Promise<void>) => {
        disconnectedHandlers.push(handler);
      },
      close: mock(async () => {
        firstBrowser.connected = false;
      }),
    };
    const secondBrowser = {
      connected: true,
      process: () => undefined,
      on: mock((_event: string, _handler: () => void | Promise<void>) => {}),
      close: mock(async () => {
        secondBrowser.connected = false;
      }),
    };

    const launchMock = mock(async () => firstBrowser)
      .mockImplementationOnce(async () => firstBrowser)
      .mockImplementationOnce(async () => secondBrowser);
    mock.module('puppeteer-core', () => ({
      default: { launch: launchMock },
    }));

    const { BrowserToPdfRenderer } = await import('./render-to');
    const renderer = new BrowserToPdfRenderer();

    await renderer.launch();
    await renderer.launch();

    expect(disconnectedHandlers).toHaveLength(1);

    firstBrowser.connected = false;
    const [recoveredA, recoveredB] = await Promise.all([
      (renderer as unknown as { browser: () => Promise<unknown> }).browser(),
      (renderer as unknown as { browser: () => Promise<unknown> }).browser(),
    ]);

    expect(recoveredA).toBe(secondBrowser);
    expect(recoveredB).toBe(secondBrowser);
    expect(firstBrowser.close).toHaveBeenCalledTimes(1);
    expect(launchMock).toHaveBeenCalledTimes(2);

    await renderer.close();

    expect(launchMock).toHaveBeenCalledTimes(2);
  });
});
