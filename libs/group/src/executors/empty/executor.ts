import type { groupEmptyExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<groupEmptyExecutorSchema> = async () => {
  return {
    success: true,
  };
};

export default runExecutor;
