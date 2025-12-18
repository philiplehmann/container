import { resolve } from 'node:path';
import type { ExecutorContext } from '@nx/devkit';
import { getCwd } from 'nx/src/utils/path';

export const projectRoot = (context: ExecutorContext): string => {
  if (context.projectName && context.projectGraph) {
    const project = context.projectGraph.nodes[context.projectName];
    if (project?.data.root) {
      return project.data.root;
    }
  }
  if (context.root) {
    return context.root;
  }
  return getCwd();
};
