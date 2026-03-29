import type { ExecutorContext } from '@nx/devkit';

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
  return process.cwd();
};
