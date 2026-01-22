import { relative } from 'node:path';
import { cwd } from 'node:process';
import type { ExecutorContext } from '@nx/devkit';
import { projectRoot as getProjectRoot } from './project-root';

export const replacePlaceholders = (context: ExecutorContext) => {
  const projectRoot = getProjectRoot(context);
  const workspaceRoot = context.root;
  const relativeWorkspaceRoot = relative(cwd(), workspaceRoot);
  const replace = {
    '{projectRoot}': projectRoot,
    '{workspaceRoot}': relativeWorkspaceRoot === '' ? '.' : relativeWorkspaceRoot,
  };
  return (path: string) => Object.entries(replace).reduce((acc, [key, value]) => acc.replaceAll(key, value), path);
};
