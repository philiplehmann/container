import { ConvertToMimeType, schema, unoconvert, unoserver } from '@container/binary/unoserver';
import { connect, healthEndpoints, post } from '@container/http/route';
import { httpServer } from '@container/http/server';
import { middlewareQuery } from '@container/http/validate';

const PORT = process.env.PORT || '3000';

const main = async () => {
  await unoserver();

  httpServer(
    connect(
      post('/convert', middlewareQuery(schema), async ({ req, res, query: { convertTo } }) => {
        // unoconvert [-h] [--convert-to CONVERT_TO] [--filter FILTER_NAME] [--interface INTERFACE] [--port PORT] infile outfile
        res.setHeader('Content-Type', ConvertToMimeType[convertTo]);

        unoconvert({ input: req, output: res, to: convertTo });
      }),
      ...healthEndpoints,
    ),
    { port: PORT, name: 'unoserver' },
  );
};

main();
