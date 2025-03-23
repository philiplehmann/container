import type { PromiseExecutor } from '@nx/devkit';
import { dockerBuildxBuild } from '../../docker-buildx-build';
import { currentArch } from '../../docker-helper';
import { dockerImageRemove } from '../../docker-image-remove';
import type { DockerTestExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<DockerTestExecutorSchema> = async ({ file, tag }): Promise<{ success: boolean }> => {
  if (process.env.TEST_SERVER_RUNNER === 'local') {
    console.log('Skipping docker build because of TEST_SERVER_RUNNER=local');
    return {
      success: true,
    };
  }
  try {
    const platform = currentArch();
    const tagWithPlatform = `${tag}-${platform}`;
    await dockerImageRemove(tagWithPlatform);
    await dockerBuildxBuild({
      platforms: [platform],
      output: 'load',
      file,
      tags: [tagWithPlatform],
    });
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
