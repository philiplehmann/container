import { middlewareQuery } from '@riwi/http/validate';
import { configureProcessTracker, type ProcessTrackerConfig, processTracker } from '@riwi/stream';
import { z } from 'zod/v4';
import type { NextResponse } from './http-route';
import { del } from './method/del';
import { get } from './method/get';
import { routes } from './routes';

const listQuerySchema = z.object({
  status: z.enum(['running', 'completed', 'killed', 'failed']).optional(),
});

const killQuerySchema = z.object({
  signal: z.enum(['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP']).default('SIGTERM'),
});

const clearQuerySchema = z.object({
  olderThan: z.coerce.number().optional(),
});

// UUID regex pattern
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// All process endpoints nested under /processes to avoid path matching conflicts
export const processEndpoints = (config?: ProcessTrackerConfig) => {
  if (config) {
    configureProcessTracker(config);
  }

  return [
    routes(
      { path: 'processes' },
      // GET /processes - List all tracked processes with summary
      get('/', middlewareQuery(listQuerySchema), async ({ query }): Promise<NextResponse> => {
        const processes = processTracker.list(query.status ? { status: query.status } : undefined);
        const summary = processTracker.getSummary();
        return { statusCode: 200, body: { processes, summary } };
      }),
      // DELETE /processes - Clear completed/failed/killed processes
      del('/', middlewareQuery(clearQuerySchema), async ({ query }): Promise<NextResponse> => {
        const cleared = processTracker.clear(query.olderThan);
        return { statusCode: 200, body: { cleared } };
      }),
      // /processes/:id routes
      routes(
        { path: uuidPattern, name: 'id' },
        // GET /processes/:id - Get a single process by ID
        get('/', async ({ params }): Promise<NextResponse> => {
          const id = params.id as string;
          const process = processTracker.get(id);
          if (!process) {
            return { statusCode: 404, body: { error: 'Process not found' } };
          }
          return { statusCode: 200, body: process as unknown as Record<string, unknown> };
        }),
        // DELETE /processes/:id - Kill a running process
        del('/', middlewareQuery(killQuerySchema), async ({ params, query }): Promise<NextResponse> => {
          const id = params.id as string;
          const process = processTracker.get(id);
          if (!process) {
            return { statusCode: 404, body: { error: 'Process not found' } };
          }
          if (process.status !== 'running') {
            return {
              statusCode: 400,
              body: { error: 'Process is not running', process: process as unknown as Record<string, unknown> },
            };
          }
          const signal = query.signal as NodeJS.Signals;
          const success = processTracker.kill(id, signal);
          const updatedProcess = processTracker.get(id);
          return {
            statusCode: success ? 200 : 500,
            body: { success, process: updatedProcess as unknown as Record<string, unknown> },
          };
        }),
      ),
    ),
  ];
};
