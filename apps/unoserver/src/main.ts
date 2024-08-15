import { post, healthEndpoints, connect } from '@container/http/route';
import { middlewareQuery } from '@container/http/validate';
import { unoconvert, unoserver, ConvertToMimeType, schema } from '@container/binary/unoserver';
import { httpServer } from '@container/http/server';

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
