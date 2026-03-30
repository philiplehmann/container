import { imageToText } from '@riwi/binary/tesseract';
import { handleRouteError } from '@riwi/http/error';
import { connect, healthEndpoints, post } from '@riwi/http/route';
import { httpServer } from '@riwi/http/server';

const PORT = process.env.PORT || '3000';

httpServer(
  connect(
    post({ path: '/image-to-text' }, async ({ req, res }) => {
      res.setHeader('Content-Type', 'text/plain');
      try {
        await imageToText({ input: req, output: res });
      } catch (error) {
        handleRouteError(res, error, 'tesseract failed');
      }
    }),
    ...healthEndpoints,
  ),
  { port: PORT, name: 'tesseract' },
);
