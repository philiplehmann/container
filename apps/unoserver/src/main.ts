import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

import { post, healthEndpoints, connect } from '@container/http/route';
import { streamChildProcess } from '@container/stream';
import { schema } from './schema';
import { middlewareQuery } from '@container/http/validate';

const PORT = process.env.PORT || '3000';

const unoserver = spawn('unoserver', { stdio: 'inherit' });

const mimeType = Object.freeze({
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
} as const);

const server = createServer(
  connect(
    post('/convert', middlewareQuery(schema), async ({ req, res, query: { convertTo = 'pdf' } }) => {
      // unoconvert [-h] [--convert-to CONVERT_TO] [--filter FILTER_NAME] [--interface INTERFACE] [--port PORT] infile outfile
      res.setHeader('Content-Type', mimeType[convertTo]);

      const unoconvert = spawn('unoconvert', ['--convert-to', convertTo, '-', '-']);
      return streamChildProcess(req, res, unoconvert);
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
