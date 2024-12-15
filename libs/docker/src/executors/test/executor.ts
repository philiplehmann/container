import type { DockerTestExecutorSchema } from './schema';
import { dockerBuildxBuild } from '../../docker-buildx-build';
import { dockerImageRemove } from '../../docker-image-remove';
import type { Executor } from '@nx/devkit';
import { currentArch } from '../../docker-helper';

const runExecutor: Executor<DockerTestExecutorSchema> = async ({ file, tag }): Promise<{ success: boolean }> => {
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
