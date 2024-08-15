import type { DockerTestExecutorSchema } from './schema';
import { dockerBuildxBuild } from '../../docker-buildx-build';
import { dockerImageRemove } from '../../docker-image-remove';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<DockerTestExecutorSchema> = async ({
  file,
  tag,
  platforms,
}): Promise<{ success: boolean }> => {
  const promises = await Promise.allSettled(
    platforms.map(async (platform) => {
      const tagWithPlatform = `${tag}-${platform}`;
      await dockerImageRemove(tagWithPlatform);
      await dockerBuildxBuild({
        platforms: [platform],
        output: 'load',
        file,
        tags: [tagWithPlatform],
      });
    }),
  );
  if (promises.some((promise) => promise.status === 'rejected')) {
    return {
      success: false,
    };
  }
  return {
    success: true,
  };
};

export default runExecutor;
