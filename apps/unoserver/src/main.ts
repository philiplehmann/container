import { libreoffice, schema as schemaLibreoffice } from '@riwi/binary/libreoffice';
import { libreofficeFs, schema as schemaLibreofficeFs } from '@riwi/binary/libreoffice-fs';
import {
  ConvertToMimeType as ConvertToMimeTypeUnoserver,
  schema as schemaUnoserver,
  unoconvert,
  unoserver,
} from '@riwi/binary/unoserver';
import { connect, healthEndpoints, post, processEndpoints } from '@riwi/http/route';
import { httpServer } from '@riwi/http/server';
import { middlewareBody, middlewareQuery } from '@riwi/http/validate';

const PORT = process.env.PORT || '3000';
const DIRECT_ONLY = process.env.UNOSERVER_DIRECT_ONLY === 'true';
const FS_ENABLE = process.env.UNOSERVER_FS_ENABLE === 'true';
const FS_INPUT_ROOT = process.env.UNOSERVER_FS_INPUT_ROOT || '/data/in';
const FS_OUTPUT_ROOT = process.env.UNOSERVER_FS_OUTPUT_ROOT || '/data/out';
const PROCESS_ENABLED = process.env.UNOSERVER_PROCESS_ENABLED === 'true';
const PROCESS_RETENTION_MS = process.env.UNOSERVER_PROCESS_RETENTION_MS
  ? Number.parseInt(process.env.UNOSERVER_PROCESS_RETENTION_MS, 10)
  : undefined;
const PROCESS_MAX_COMPLETED = process.env.UNOSERVER_PROCESS_MAX_COMPLETED
  ? Number.parseInt(process.env.UNOSERVER_PROCESS_MAX_COMPLETED, 10)
  : undefined;

const main = async () => {
  if (!DIRECT_ONLY) {
    await unoserver();
  }

  const unoconvertRoute = () =>
    post('/convert', middlewareQuery(schemaUnoserver), async ({ req, res, query }) => {
      res.setHeader('Content-Type', ConvertToMimeTypeUnoserver[query.convertTo]);

      unoconvert({ input: req, output: res, ...query });
    });
  const libreofficeRoute = () =>
    post('/direct', middlewareQuery(schemaLibreoffice), async ({ req, res, query }) => {
      res.setHeader('Content-Type', ConvertToMimeTypeUnoserver[query.convertTo]);

      await libreoffice({ input: req, output: res, ...query });
    });
  const libreofficeFsRoute = () =>
    post('/direct-fs', middlewareBody(schemaLibreofficeFs), async ({ body }) => {
      return await libreofficeFs({
        body,
        inputRoot: FS_INPUT_ROOT,
        outputRoot: FS_OUTPUT_ROOT,
      });
    });
  httpServer(
    connect(
      ...(FS_ENABLE ? [libreofficeFsRoute()] : []),
      ...(DIRECT_ONLY ? [libreofficeRoute()] : [unoconvertRoute(), libreofficeRoute()]),
      ...healthEndpoints,
      ...(PROCESS_ENABLED
        ? processEndpoints({
            retentionMs: PROCESS_RETENTION_MS,
            maxCompleted: PROCESS_MAX_COMPLETED,
          })
        : []),
    ),
    { port: PORT, name: 'unoserver' },
  );
};

main();
