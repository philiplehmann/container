import { resolve as pathResolve, dirname } from 'path/posix';

export const getRequirementsPath = (dockerfile: string) => {
  return pathResolve(dirname(dockerfile), 'requirements.txt');
};
