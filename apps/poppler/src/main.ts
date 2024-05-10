import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

import { routes, post, healthEndpoints } from '@container/http/route';
import { streamHttpBinary } from '@container/stream/http-binary';

const PORT = process.env.PORT || '3000';

const server = createServer(
  routes(
    post({ path: '/pdf-to-text' }, async (req, res) => {
      res.setHeader('Content-Type', 'plain/text');

      const pdfToText = spawn('pdftotext', ['-', '-']);
      streamHttpBinary(req, res, pdfToText);
    }),

    post({ path: '/pdf-to-html' }, async (req, res) => {
      res.setHeader('Content-Type', 'plain/html');

      const pdfToHtml = spawn('pdftohtml', ['-stdout', '-noframes', '-', '-']);
      streamHttpBinary(req, res, pdfToHtml);
    }),
    ...healthEndpoints,
  ),
).listen(PORT, () => {
  console.log('start poppler server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
});
