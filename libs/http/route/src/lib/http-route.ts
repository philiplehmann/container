import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError } from '@container/http/error';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type Response = ServerResponse<IncomingMessage> & {
  req: IncomingMessage;
};
type Next = (req: IncomingMessage, res: Response) => Promise<void> | void;

export const route =
  ({ method, path }: { method: HttpMethod; path: string }, next: Next) =>
  async (req: IncomingMessage, res: Response) => {
    if (req.method === method && req.url === path) {
      try {
        return await next(req, res);
      } catch (error) {
        if (error instanceof HttpError) {
          res.statusCode = error.status;
          res.write(error.message);
          return res.end();
        }
        // not a known http error, so return a 500
        res.statusCode = 500;
        if (error instanceof Error) {
          res.write(error.message);
        } else if (typeof error === 'string') {
          res.write(error);
        } else {
          res.write('unknown error');
        }
        return res.end();
      }
    }
  };

export const get = (path: string, next: Next) => route({ method: 'GET', path }, next);
export const post = (path: string, next: Next) => route({ method: 'POST', path }, next);
export const put = (path: string, next: Next) => route({ method: 'PUT', path }, next);
export const patch = (path: string, next: Next) => route({ method: 'PATCH', path }, next);
export const del = (path: string, next: Next) => route({ method: 'DELETE', path }, next);

export const routes =
  (...routes: ReturnType<typeof route>[]) =>
  async (req: IncomingMessage, res: Response) => {
    return Promise.allSettled(routes.map((route) => route(req, res)));
  };
