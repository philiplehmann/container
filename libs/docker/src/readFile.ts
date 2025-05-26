import { readFileSync } from 'fs';

export const readFile = (path: string) => {
  return readFileSync(path, 'utf-8');
};
