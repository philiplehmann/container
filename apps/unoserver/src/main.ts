import { spawn } from 'node:child_process';
import { createServer, IncomingMessage } from 'node:http';

import { routes, post, get, healthEndpoints } from '@container/http/route';
import { streamHttpBinary } from '@container/stream/http-binary';
import { schema } from './schema';

const PORT = process.env.PORT || '3000';

const unoserver = spawn('unoserver', { stdio: 'inherit' });

const mimeType = Object.freeze({
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
} as const);

const server = createServer(
  routes(
    post({ path: '/convert', query: schema }, async (req, res, { query: { convertTo = 'pdf' } }) => {
      // unoconvert [-h] [--convert-to CONVERT_TO] [--filter FILTER_NAME] [--interface INTERFACE] [--port PORT] infile outfile
      res.setHeader('Content-Type', mimeType[convertTo]);

      const unoconvert = spawn('unoconvert', ['--convert-to', convertTo, '-', '-']);
      streamHttpBinary(req, res, unoconvert);
    }),
    ...healthEndpoints,
  ),
).listen(PORT, () => {
  console.log('start unoserver server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
  unoserver.kill();
});
