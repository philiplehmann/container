import type { RoutePathOptions } from './routes';

export const pathMatcher = <T extends string>(
  reqPath: string,
  paths: RoutePathOptions<T>[],
): Record<T, string> | null => {
  let internalPath = reqPath.split('/').filter(Boolean);

  const params: Record<string, string> = {};

  for (const { path, name } of paths) {
    if (typeof path === 'string') {
      if (internalPath[0] !== path) {
        return null;
      }
    } else {
      // Regex path - require a matching segment
      if (!internalPath[0]) {
        return null;
      }
      const match = internalPath[0].match(path);
      if (!match) {
        return null;
      }
      params[name ?? 'missing'] = internalPath[0];
    }
    internalPath = internalPath.slice(1);
  }
  // Ensure all URL segments were consumed - no trailing segments allowed
  if (internalPath.length > 0) {
    return null;
  }
  return params;
};
