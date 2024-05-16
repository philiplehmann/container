import { createServer } from 'node:http';
import { routes, post, healthEndpoints } from '@container/http/route';
import { schema } from './schema';
import { bodyToPdf } from './bodyToPdf';
import { bodyToImage } from './bodyToImage';
import { middlewareBody } from '@container/http/validate';

const PORT = process.env.PORT || '3000';

const server = createServer(
  routes(
    post('/', middlewareBody(schema), async ({ body }) => {
      return bodyToPdf(body);
    }),
    post('/pdf', middlewareBody(schema), async ({ body }) => {
      return bodyToPdf(body);
    }),
    post('/image', middlewareBody(schema), async ({ body }) => {
      return bodyToImage(body);
    }),
    ...healthEndpoints,
  ),
).listen(PORT, () => {
  console.log('start puppeteer server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
});
