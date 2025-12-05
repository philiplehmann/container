import { post } from '@container/http/route';
import { useTestServer } from '@container/test/server';
import { describe, it } from 'node:test';

describe('http-multipart-form-data', () => {
  const server = useTestServer(
    post({ path: '/form-data' }, async () => {
      return { statusCode: 200 };
    }),
  );
  it('stream multipart/form-data', async () => {});
});
