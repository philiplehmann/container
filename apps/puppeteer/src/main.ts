import { createServer } from 'node:http';
import puppeteer from 'puppeteer';
import { routes, post, healthEndpoints } from '@container/http/route';
import { schema } from './schema';

const PORT = process.env.PORT || '3000';

const server = createServer(
  routes(
    post({ path: '/', body: schema }, async (_, res, { body }) => {
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
          ...body,
        };
        if (typeof url === 'string') {
          await page.goto(url);
          await page.waitForNetworkIdle({ idleTime: 1_000, timeout: 5_000 });
        } else if (typeof html === 'string') {
          await page.setContent(html);
        } else {
          throw new Error('url or html is required');
        }

        const buffer = await page.pdf(props);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/pdf');
        res.write(buffer);
        res.end();
      } finally {
        await browser.close();
      }
    }),
    ...healthEndpoints,
  ),
).listen(PORT, () => {
  console.log('start puppeteer server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
});
