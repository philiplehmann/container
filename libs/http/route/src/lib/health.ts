import { get } from './http-route';

export const healthEndpoints = [
  get('/health', (_, res) => {
    res.write('ok');
    res.end();
  }),
  get('/health/liveness', (_, res) => {
    res.write('ok');
    res.end();
  }),
  get('/health/readiness', (_, res) => {
    res.write('ok');
    res.end();
  }),
];
