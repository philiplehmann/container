import { libreoffice, schema as schemaLibreoffice } from '@container/binary/libreoffice';
import {
  ConvertToMimeType as ConvertToMimeTypeUnoserver,
  schema as schemaUnoserver,
  unoconvert,
  unoserver,
} from '@container/binary/unoserver';
import { connect, healthEndpoints, post } from '@container/http/route';
import { HttpError } from '@container/http/error';
import { httpServer } from '@container/http/server';
import { middlewareBody, middlewareQuery } from '@container/http/validate';
import { directFsConvert } from './lib/direct-fs-convert';
import { resolvePathUnderRoot } from './lib/path-safety';
import { directFsBodySchema } from './schema/direct-fs';

const PORT = process.env.PORT || '3000';
const ENABLE_FILESYSTEM_PROCESSING_ACCESS = process.env.ENABLE_FILESYSTEM_PROCESSING_ACCESS === 'true';
const FS_INPUT_ROOT = process.env.FS_INPUT_ROOT || '/data/in';
const FS_OUTPUT_ROOT = process.env.FS_OUTPUT_ROOT || '/data/out';

const main = async () => {
  if (process.env.UNOSERVER_DIRECT_ONLY !== 'true') {
    await unoserver();
  }

  const unoconvertRoute = post('/convert', middlewareQuery(schemaUnoserver), async ({ req, res, query }) => {
    res.setHeader('Content-Type', ConvertToMimeTypeUnoserver[query.convertTo]);

    unoconvert({ input: req, output: res, ...query });
  });
  const libreofficeRoute = post('/direct', middlewareQuery(schemaLibreoffice), async ({ req, res, query }) => {
    res.setHeader('Content-Type', ConvertToMimeTypeUnoserver[query.convertTo]);

    await libreoffice({ input: req, output: res, ...query });
  });
  const directFsRoute = post('/direct-fs', middlewareBody(directFsBodySchema), async ({ body }) => {
    try {
      const inputAbsolutePath = resolvePathUnderRoot(FS_INPUT_ROOT, body.inputPath, 'inputPath');
      const outputAbsolutePath = resolvePathUnderRoot(FS_OUTPUT_ROOT, body.outputPath, 'outputPath');
      const { outputBytes, durationMs } = await directFsConvert({
        inputAbsolutePath,
        outputAbsolutePath,
        convertTo: body.convertTo,
        outputFilter: body.outputFilter,
        filterOptions: body.filterOptions,
      });

      return {
        statusCode: 200,
        contentType: 'application/json',
        body: {
          status: 'complete',
          inputPath: body.inputPath,
          outputPath: body.outputPath,
          outputBytes,
          durationMs,
        },
      };
    } catch (error) {
      const statusCode = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'unknown error';

      return {
        statusCode,
        contentType: 'application/json',
        body: {
          status: 'error',
          message,
        },
      };
    }
  });

  httpServer(
    connect(
      ...(ENABLE_FILESYSTEM_PROCESSING_ACCESS ? [directFsRoute] : []),
      ...(process.env.UNOSERVER_DIRECT_ONLY === 'true' ? [libreofficeRoute] : [unoconvertRoute, libreofficeRoute]),
      ...healthEndpoints,
    ),
    { port: PORT, name: 'unoserver' },
  );
};

main();
