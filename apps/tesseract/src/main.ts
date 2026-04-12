import { imageToText } from '@riwi/binary/tesseract';
import { connect, healthEndpoints, post, processEndpoints } from '@riwi/http/route';
import { httpServer } from '@riwi/http/server';

const PORT = process.env.PORT || '3000';
const PROCESS_ENABLED = process.env.TESSERACT_PROCESS_ENABLED === 'true';

httpServer(
  connect(
    post({ path: '/image-to-text' }, async ({ req, res }) => {
      res.setHeader('Content-Type', 'text/plain');
      try {
        await imageToText({ input: req, output: res });
      } catch (error) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : 'tesseract failed');
        }
      }
    }),
    ...healthEndpoints,
    ...(PROCESS_ENABLED ? processEndpoints : []),
  ),
  { port: PORT, name: 'tesseract' },
);
