import { isAbsolute, resolve, sep } from 'node:path';
import { BadRequest } from '@riwi/http/error';

export function resolvePathUnderRoot(root: string, inputPath: string, fieldName: string): string {
  if (isAbsolute(inputPath)) {
    throw new BadRequest(`${fieldName} must be a relative path`);
  }

  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, inputPath);
  const rootPrefix = resolvedRoot.endsWith(sep) ? resolvedRoot : `${resolvedRoot}${sep}`;

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(rootPrefix)) {
    throw new BadRequest(`${fieldName} must resolve within configured root`);
  }

  return resolvedPath;
}
