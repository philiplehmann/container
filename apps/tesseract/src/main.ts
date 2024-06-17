import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

import { connect, post, healthEndpoints } from '@container/http/route';
import { streamChildProcess } from '@container/stream';

const PORT = process.env.PORT || '3000';

const server = createServer(
  connect(
    post({ path: '/image-to-text' }, async ({ req, res }) => {
      const imageToText = spawn('tesseract', ['-', '-']);
      return streamChildProcess(req, res, imageToText);
    }),
    ...healthEndpoints,
  ),
).listen(PORT, () => {
  console.log('start poppler server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
});
