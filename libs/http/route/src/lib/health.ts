import { get } from './method/get';

export const healthEndpoints = [
  get('/health/liveness', async () => {
    return { statusCode: 200, body: 'ok' };
  }),
  get('/health/readiness', async () => {
    return { statusCode: 200, body: 'ok' };
  }),
];
