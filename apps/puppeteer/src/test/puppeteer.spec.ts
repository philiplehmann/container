import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { testRequest } from '@container/test/request';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';

const containerPort = 5000;

describe('puppeteer', { timeout: 180_000 }, () => {
  ['amd', 'arm'].map((arch) => {
    describe(`arch: ${arch}`, () => {
      let container: StartedTestContainer;
      let port: number;

      beforeAll(async () => {
        container = await new GenericContainer(`philiplehmann/puppeteer:test-${arch}`)
          .withEnvironment({ PORT: String(containerPort) })
          .withExposedPorts(containerPort)
          .withLogConsumer((stream) => stream.pipe(process.stdout))
          .start();

        port = container.getMappedPort(containerPort);
      });

      afterAll(async () => {
        await container.stop();
      });

      it('should convert url to pdf', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port,
          path: '/',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://google.com' }),
        });

        expect(response.statusCode).toBe(200);
        expect(text.substring(0, 5)).toBe('%PDF-');
      });

      it('should convert html to pdf', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          port,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: '<h1>Hello World</h1>' }),
        });

        expect(response.statusCode).toBe(200);
        expect(text.substring(0, 5)).toBe('%PDF-');
      });

      it('should complain about missing content-type', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          port,
          body: JSON.stringify({ html: '<h1>Hello World</h1>' }),
        });

        expect(response.statusCode).toBe(400);
        expect(text).toBe(
          '{"issues":[{"code":"invalid_literal","expected":"application/json","path":["content-type"],"message":"Invalid literal value, expected \\"application/json\\""}],"name":"ZodError"}',
        );
      });

      it('should complain about missing url / html', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          port,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        expect(response.statusCode).toBe(400);
        expect(text).toBe(
          '{"issues":[{"code":"invalid_union","unionErrors":[{"issues":[{"code":"invalid_type","expected":"string","received":"undefined","path":["url"],"message":"Required"}],"name":"ZodError"},{"issues":[{"code":"invalid_type","expected":"string","received":"undefined","path":["html"],"message":"Required"}],"name":"ZodError"}],"path":[],"message":"Invalid input"}],"name":"ZodError"}',
        );
      });

      it('should convert url to pdf with all properties', async () => {
        const [response, text] = await testRequest({
          method: 'POST',
          port,
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

        expect(response.statusCode).toBe(200);
        expect(text.substring(0, 5)).toBe('%PDF-');
      });
    });
  });
});
