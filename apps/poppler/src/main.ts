import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

import { connect, post, healthEndpoints } from '@container/http/route';
import { streamChildProcess } from '@container/stream';

const PORT = process.env.PORT || '3000';

const server = createServer(
  connect(
    post('/pdf-to-text', async ({ req, res }) => {
      res.setHeader('Content-Type', 'plain/text');

      const pdfToText = spawn('pdftotext', ['-', '-']);
      return streamChildProcess(req, res, pdfToText);
    }),
    post('/pdf-to-html', async ({ req, res }) => {
      res.setHeader('Content-Type', 'plain/html');

      const pdfToHtml = spawn('pdftohtml', ['-stdout', '-noframes', '-', '-']);
      return streamChildProcess(req, res, pdfToHtml);
    }),
    ...healthEndpoints,
  ),
).listen(PORT, () => {
  console.log('start poppler server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
});
