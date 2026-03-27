import { libreoffice, schema as schemaLibreoffice } from '@container/binary/libreoffice';
import {
  ConvertToMimeType as ConvertToMimeTypeUnoserver,
  schema as schemaUnoserver,
  unoconvert,
  unoserver,
} from '@container/binary/unoserver';
import { connect, healthEndpoints, post } from '@container/http/route';
import { httpServer } from '@container/http/server';
import { middlewareQuery } from '@container/http/validate';
import { createDirectFsRoute } from './lib/direct-fs-convert';

const PORT = process.env.PORT || '3000';
const DIRECT_ONLY = process.env.UNOSERVER_DIRECT_ONLY === 'true';
const FS_ENABLE = process.env.UNOSERVER_FS_ENABLE === 'true';

const main = async () => {
  if (!DIRECT_ONLY) {
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
  httpServer(
    connect(
      ...(FS_ENABLE ? [createDirectFsRoute()] : []),
      ...(DIRECT_ONLY ? [libreofficeRoute] : [unoconvertRoute, libreofficeRoute]),
      ...healthEndpoints,
    ),
    { port: PORT, name: 'unoserver' },
  );
};

main();
