import type { DockerTestExecutorSchema } from './schema';
import { dockerBuildxBuild, dockerImageRemove } from '../../docker';
import type { Executor } from '@nx/devkit';

const runExecutor: Executor<DockerTestExecutorSchema> = async ({ file, tag, platforms }) => {
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
