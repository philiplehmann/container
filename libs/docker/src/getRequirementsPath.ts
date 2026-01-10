import { dirname, resolve as pathResolve } from 'path/posix';

export const getRequirementsPath = (dockerfile: string) => {
  return pathResolve(dirname(dockerfile), 'requirements.txt');
};
