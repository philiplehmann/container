import type { Executor } from '@nx/devkit';
import { dockerRun } from '../../docker-run';
import type { DockerRunExecutorSchema } from './schema';

const runExecutor: Executor<DockerRunExecutorSchema> = async (options) => {
  try {
    await dockerRun(options);
    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
    };
  }
};

export default runExecutor;
