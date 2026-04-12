import { middlewareQuery } from '@riwi/http/validate';
import { processTracker } from '@riwi/stream';
import { z } from 'zod/v4';
import type { NextResponse } from './http-route';
import { del } from './method/del';
import { get } from './method/get';

const listQuerySchema = z.object({
  status: z.enum(['running', 'completed', 'killed', 'failed']).optional(),
});

const killQuerySchema = z.object({
  signal: z.enum(['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP']).default('SIGTERM'),
});

const clearQuerySchema = z.object({
  olderThan: z.coerce.number().optional(),
});

export const processEndpoints = [
  // GET /processes - List all tracked processes with summary
  get('/processes', middlewareQuery(listQuerySchema), async ({ query }): Promise<NextResponse> => {
    const processes = processTracker.list(query.status ? { status: query.status } : undefined);
    const summary = processTracker.getSummary();
    return { statusCode: 200, body: { processes, summary } };
  }),

  // GET /processes/:id - Get a single process by ID
  get('/processes/:id', async ({ params }): Promise<NextResponse> => {
    const id = params.id as string;
    const process = processTracker.get(id);
    if (!process) {
      return { statusCode: 404, body: { error: 'Process not found' } };
    }
    return { statusCode: 200, body: process as unknown as Record<string, unknown> };
  }),

  // DELETE /processes/:id - Kill a running process
  del('/processes/:id', middlewareQuery(killQuerySchema), async ({ params, query }): Promise<NextResponse> => {
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

  // DELETE /processes - Clear completed/failed/killed processes
  del('/processes', middlewareQuery(clearQuerySchema), async ({ query }): Promise<NextResponse> => {
    const cleared = processTracker.clear(query.olderThan);
    return { statusCode: 200, body: { cleared } };
  }),
];
