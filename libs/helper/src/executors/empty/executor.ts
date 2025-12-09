import type { PromiseExecutor } from '@nx/devkit';
import type { helperEmptyExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<helperEmptyExecutorSchema> = async () => {
  return {
    success: true,
  };
};

export default runExecutor;
