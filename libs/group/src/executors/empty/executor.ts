import type { GroupEmptyExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<GroupEmptyExecutorSchema> = async () => {
  return {
    success: true,
  };
};

export default runExecutor;
