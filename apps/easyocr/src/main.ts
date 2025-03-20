import { post, healthEndpoints, connect } from '@container/http/route';
import { middlewareHeader, middlewareQuery } from '@container/http/validate';
import { readtext, headerSchema, querySchema, extractSwissHealthCardInfo, Detail } from '@container/binary/easyocr';
import { httpServer } from '@container/http/server';

const PORT = process.env.PORT || '3000';

const main = async () => {
  httpServer(
    connect(
      post('/readtext', middlewareHeader(headerSchema), middlewareQuery(querySchema), async ({ req, query }) => {
        const body = await readtext({
          input: req,
          params: { ...query, modelStorageDirectory: 'model', userNetworkDirectory: 'userNetwork' },
        });
        return {
          statusCode: 200,
          body,
        };
      }),
      post(
        '/swiss-health-card',
        middlewareHeader(headerSchema),
        middlewareQuery(querySchema),
        async ({ req, query }) => {
          const results = await readtext({
            input: req,
            params: {
              ...query,
              detail: Detail.textCoordinates,
              modelStorageDirectory: 'model',
              userNetworkDirectory: 'userNetwork',
            },
          });
          const cardInfo = extractSwissHealthCardInfo(results);
          return {
            statusCode: 200,
            body: {
              cardInfo,
              results,
            },
          };
        },
      ),
      ...healthEndpoints,
    ),
    { port: PORT, name: 'easyocr' },
  );
};

main();
