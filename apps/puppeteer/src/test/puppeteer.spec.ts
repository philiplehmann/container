import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { useTestContainer } from '@container/test/server';

const containerPort = 5000;

describe('puppeteer', { timeout: 120_000 }, () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, async () => {
      const setup = await useTestContainer({ image: `philiplehmann/puppeteer:test-${arch}`, containerPort });

      it('should convert url to pdf', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://google.com' }),
        });

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(text.substring(0, 5), '%PDF-');
      });

      it('should convert html to pdf', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          port: setup.port,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: '<h1>Hello World</h1>' }),
        });

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(text.substring(0, 5), '%PDF-');
      });

      it('should complain about missing content-type', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          port: setup.port,
          body: JSON.stringify({ html: '<h1>Hello World</h1>' }),
        });

        assert.strictEqual(response.statusCode, 400);
        assert.strictEqual(text, 'Invalid request headers');
      });

      it('should complain about missing url / html', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          port: setup.port,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        assert.strictEqual(response.statusCode, 400);
        assert.strictEqual(text, 'Invalid body');
      });

      it('should convert url to pdf with all properties', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          port: setup.port,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://google.com',
            scale: 1,
            displayHeaderFooter: true,
            headerTemplate: 'header',
            footerTemplate: 'footer',
            printBackground: true,
            landscape: true,
            pageRanges: '1-2',
            format: 'A4',
            width: 100,
            height: 100,
            preferCSSPageSize: true,
            margin: {
              top: 10,
              bottom: 10,
              left: 10,
              right: 10,
            },
            omitBackground: true,
            tagged: true,
            outline: true,
            timeout: 1000,
          }),
        });

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(text.substring(0, 5), '%PDF-');
      });
    });
  });
});
