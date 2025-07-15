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
  if (process.env.UNOSERVER_DIRECT_ONLY !== 'true') {
    await unoserver();
  }

  const unoconvertRoute = post('/convert', middlewareQuery(schemaUnoserver), async ({ req, res, query }) => {
    res.setHeader('Content-Type', ConvertToMimeTypeUnoserver[query.convertTo]);

    unoconvert({ input: req, output: res, ...query });
  });
  const libreofficeRoute = post(
    '/direct',
    middlewareQuery(schemaLibreoffice),
    async ({ req, res, query: { convertTo } }) => {
      res.setHeader('Content-Type', ConvertToMimeTypeLibreoffice[convertTo]);
      try {
        await libreoffice({ input: req, output: res, to: convertTo });
      } catch (error) {
        res.statusCode = 500;
        if (error instanceof Error) {
          res.statusMessage = error.message;
          res.end(`Error during conversion: ${error.message}`);
        } else {
          res.statusMessage = 'Unknown error';
          res.end('Error during conversion');
        }
      }
    },
  );

  httpServer(
    connect(
      ...(process.env.UNOSERVER_DIRECT_ONLY === 'true' ? [libreofficeRoute] : [unoconvertRoute, libreofficeRoute]),
      ...healthEndpoints,
    ),
    { port: PORT, name: 'unoserver' },
  );
};

main();
