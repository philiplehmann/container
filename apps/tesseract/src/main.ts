import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

import { routes, post, healthEndpoints } from '@container/http/route';
import { streamHttpBinary } from '@container/stream/http-binary';

const PORT = process.env.PORT || '3000';

const server = createServer(
  routes(
    post({ path: '/image-to-text' }, async ({ req, res }) => {
      const imageToText = spawn('tesseract', ['-', '-']);
      streamHttpBinary(req, res, imageToText);
    }),
    ...healthEndpoints,
  ),
).listen(PORT, () => {
  console.log('start poppler server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
});
