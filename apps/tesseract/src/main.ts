import { connect, post, healthEndpoints } from '@container/http/route';
import { httpServer } from '@container/http/server';
import { imageToText } from '@container/binary/tesseract';

const PORT = process.env.PORT || '3000';

httpServer(
  connect(
    post({ path: '/image-to-text' }, async ({ req, res }) => {
      res.setHeader('Content-Type', 'text/plain');
      imageToText({ input: req, output: res });
    }),
    ...healthEndpoints,
  ),
  { port: PORT, name: 'tesseract' },
);
