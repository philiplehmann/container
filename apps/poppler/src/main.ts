import { ConvertTo, pdfTo } from '@riwi/binary/poppler';
import { connect, healthEndpoints, post, processEndpoints } from '@riwi/http/route';
import { httpServer } from '@riwi/http/server';

const PORT = process.env.PORT || '3000';
const PROCESS_ENABLED = process.env.POPPLER_PROCESS_ENABLED === 'true';
const PROCESS_RETENTION_MS = process.env.POPPLER_PROCESS_RETENTION_MS
  ? Number.parseInt(process.env.POPPLER_PROCESS_RETENTION_MS, 10)
  : undefined;
const PROCESS_MAX_COMPLETED = process.env.POPPLER_PROCESS_MAX_COMPLETED
  ? Number.parseInt(process.env.POPPLER_PROCESS_MAX_COMPLETED, 10)
  : undefined;

httpServer(
  connect(
    post('/pdf-to-text', async ({ req, res }) => {
      res.setHeader('Content-Type', 'plain/text');

      return pdfTo({ input: req, output: res, to: ConvertTo.text });
    }),
    post('/pdf-to-html', async ({ req, res }) => {
      res.setHeader('Content-Type', 'plain/html');

      return pdfTo({ input: req, output: res, to: ConvertTo.html });
    }),
    ...healthEndpoints,
    ...(PROCESS_ENABLED
      ? processEndpoints({
          retentionMs: PROCESS_RETENTION_MS,
          maxCompleted: PROCESS_MAX_COMPLETED,
        })
      : []),
  ),
  { port: PORT, name: 'poppler' },
);
