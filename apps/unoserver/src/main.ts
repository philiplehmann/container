import {
  ConvertToMimeType as ConvertToMimeTypeLibreoffice,
  libreoffice,
  schema as schemaLibreoffice,
} from '@container/binary/libreoffice';
import {
  ConvertToMimeType as ConvertToMimeTypeUnoserver,
  schema as schemaUnoserver,
  unoconvert,
  unoserver,
} from '@container/binary/unoserver';
import { connect, healthEndpoints, post } from '@container/http/route';
import { httpServer } from '@container/http/server';
import { middlewareQuery } from '@container/http/validate';

const PORT = process.env.PORT || '3000';

const main = async () => {
  await unoserver();

  httpServer(
    connect(
      post('/convert', middlewareQuery(schemaUnoserver), async ({ req, res, query: { convertTo } }) => {
        res.setHeader('Content-Type', ConvertToMimeTypeUnoserver[convertTo]);

        unoconvert({ input: req, output: res, to: convertTo });
      }),
      post('/direct', middlewareQuery(schemaLibreoffice), async ({ req, res, query: { convertTo } }) => {
        res.setHeader('Content-Type', ConvertToMimeTypeLibreoffice[convertTo]);

        libreoffice({ input: req, output: res, to: convertTo });
      }),
      ...healthEndpoints,
    ),
    { port: PORT, name: 'unoserver' },
  );
};

main();
