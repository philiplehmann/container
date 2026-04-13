import { imageToText } from '@riwi/binary/tesseract';
import { connect, healthEndpoints, post, processEndpoints } from '@riwi/http/route';
import { httpServer } from '@riwi/http/server';

const PORT = process.env.PORT || '3000';
const PROCESS_ENABLED = process.env.TESSERACT_PROCESS_ENABLED === 'true';
const PROCESS_RETENTION_MS = process.env.TESSERACT_PROCESS_RETENTION_MS
  ? Number.parseInt(process.env.TESSERACT_PROCESS_RETENTION_MS, 10)
  : undefined;
const PROCESS_MAX_COMPLETED = process.env.TESSERACT_PROCESS_MAX_COMPLETED
  ? Number.parseInt(process.env.TESSERACT_PROCESS_MAX_COMPLETED, 10)
  : undefined;

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
    ...(PROCESS_ENABLED
      ? processEndpoints({
          retentionMs: PROCESS_RETENTION_MS,
          maxCompleted: PROCESS_MAX_COMPLETED,
        })
      : []),
  ),
  { port: PORT, name: 'tesseract' },
);
