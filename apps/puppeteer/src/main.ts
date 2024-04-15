import { createServer } from 'node:http';
import puppeteer from 'puppeteer';

import { routes, post } from '@container/http/route';
import { validate } from '@container/http/validate';

import { schema } from './schema';

const PORT = process.env.PORT || '3000';

const server = createServer(
  routes(
    post(
      '/',
      validate(schema, async (_, res, body) => {
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
    ),
  ),
).listen(PORT, () => {
  console.log('start puppeteer server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
});