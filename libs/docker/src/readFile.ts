import { readFileSync } from 'node:fs';

export const readFile = (path: string) => {
  return readFileSync(path, 'utf-8');
};
