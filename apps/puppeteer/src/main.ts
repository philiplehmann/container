import { connect, post, healthEndpoints } from '@container/http/route';
import { middlewareBody, middlewareQuery } from '@container/http/validate';
import { renderTo, bodySchema, querySchema } from '@container/binary/puppeteer';
import { httpServer } from '@container/http/server';

const PORT = process.env.PORT || '3000';

httpServer(
  connect(
    post('/', middlewareBody(bodySchema), async ({ body }) => {
      const pdf = await renderTo(body, { type: 'pdf' });
      return { statusCode: 200, contentType: 'application/pdf', body: pdf };
    }),
    post('/pdf', middlewareBody(bodySchema), async ({ body }) => {
      const pdf = await renderTo(body, { type: 'pdf' });
      return { statusCode: 200, contentType: 'application/pdf', body: pdf };
    }),
    post('/image', middlewareBody(bodySchema), middlewareQuery(querySchema), async ({ body, query }) => {
      const pdf = await renderTo(body, { type: 'image', imageType: query.type });
      return { statusCode: 200, contentType: 'application/pdf', body: pdf };
    }),
    ...healthEndpoints,
  ),
  { port: PORT, name: 'puppeteer' },
);
