import type { ServerResponse } from 'node:http';

export const handleRouteError = (res: ServerResponse, error: unknown, fallbackMessage = 'request failed'): void => {
  const normalizedError = error instanceof Error ? error : new Error(fallbackMessage);

  if (res.headersSent) {
    res.destroy(normalizedError);
    return;
  }

  res.statusCode = 500;
  res.end(error instanceof Error ? error.message : fallbackMessage);
};
