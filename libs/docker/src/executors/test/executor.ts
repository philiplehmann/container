import type { PromiseExecutor } from '@nx/devkit';
import { dockerBuildxBuild } from '../../docker-buildx-build';
import { currentArch } from '../../docker-helper';
import { dockerImageRemove } from '../../docker-image-remove';
import type { DockerTestExecutorSchema } from './schema';

const runExecutor: Executor<DockerTestExecutorSchema> = async ({
  file,
  tag,
  platforms,
}): Promise<{ success: boolean }> => {
  if (process.env.TEST_SERVER_RUNNER === 'local') {
    console.log('Skipping docker build because of TEST_SERVER_RUNNER=local');
    return {
      success: true,
    };
  }
  try {
    const platform = currentArch();
    if (platforms?.length > 0 && !platforms.includes(platform)) {
      console.info('platform not supported, skipping docker build');
      return {
        success: true,
      };
    }
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
