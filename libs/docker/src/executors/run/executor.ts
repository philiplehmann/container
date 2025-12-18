import type { PromiseExecutor } from '@nx/devkit';
import { dockerRun } from '../../docker-run';
import type { DockerRunExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<DockerRunExecutorSchema> = async (options) => {
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
