import { libreoffice, schema as schemaLibreoffice } from '@riwi/binary/libreoffice';
import {
  ConvertToMimeType as ConvertToMimeTypeUnoserver,
  schema as schemaUnoserver,
  unoconvert,
  unoserver,
} from '@riwi/binary/unoserver';
import { connect, healthEndpoints, post } from '@riwi/http/route';
import { httpServer } from '@riwi/http/server';
import { middlewareQuery } from '@riwi/http/validate';

const PORT = process.env.PORT || '3000';

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

  httpServer(
    connect(
      ...(process.env.UNOSERVER_DIRECT_ONLY === 'true' ? [libreofficeRoute] : [unoconvertRoute, libreofficeRoute]),
      ...healthEndpoints,
    ),
    { port: PORT, name: 'unoserver' },
  );
};

main();
