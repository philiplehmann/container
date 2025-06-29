import { ConvertTo, pdfTo } from '@container/binary/poppler';
import { connect, healthEndpoints, post } from '@container/http/route';
import { httpServer } from '@container/http/server';

const PORT = process.env.PORT || '3000';

httpServer(
  connect(
    post('/pdf-to-text', async ({ req, res }) => {
      res.setHeader('Content-Type', 'plain/text');

      return pdfTo({ input: req, output: res, to: ConvertTo.text });
    }),
    post('/pdf-to-html', async ({ req, res }) => {
      res.setHeader('Content-Type', 'plain/html');

      return pdfTo({ input: req, output: res, to: ConvertTo.html });
    }),
    ...healthEndpoints,
  ),
  { port: PORT, name: 'poppler' },
);
