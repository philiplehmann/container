export const pathMatcher = (reqPath: string, path: (string | RegExp)[]): boolean => {
  let internalPath = reqPath.split('/').filter(Boolean);

  for (const part of path) {
    if (typeof part === 'string') {
      if (internalPath[0] !== part) {
        return false;
      }
      internalPath = internalPath.slice(1);
    } else {
      const match = internalPath[0].match(part);
      if (!match) {
        return false;
      }
      internalPath = internalPath.slice(1);
    }
  }
  return internalPath.length === 0;
};
