import { get } from './method/get';

export const healthEndpoints = [
  get('/health', () => {
    return { statusCode: 200, body: 'ok' };
  }),
  get('/health/liveness', () => {
    return { statusCode: 200, body: 'ok' };
  }),
  get('/health/readiness', () => {
    return { statusCode: 200, body: 'ok' };
  }),
];
