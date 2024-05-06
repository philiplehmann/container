import type { helperEmptyExecutorSchema } from './schema';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<helperEmptyExecutorSchema> = async () => {
  return {
    success: true,
  };
};

export default runExecutor;
