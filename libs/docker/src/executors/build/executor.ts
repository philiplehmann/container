import type { Executor } from '@nx/devkit';
import { autoTagFormat } from '../../autoTagFormat';
import { dockerBuildxBuild } from '../../docker-buildx-build';
import type { DockerBuildExecutorSchema } from './schema';

const runExecutor: Executor<DockerBuildExecutorSchema> = async (
  { file, tags = [], platforms, versionSource, versionSourceEnv, versionSourcePackage, versionFormat, sbom = true },
  { projectName, projectGraph, root },
) => {
  tags = autoTagFormat({
    tags,
    file,
    versionSource,
    versionSourceEnv,
    versionSourcePackage,
    versionFormat,
    projectName,
    root,
    projectGraph,
  });
  try {
    await dockerBuildxBuild({
      platforms: platforms,
      output: 'push',
      file,
      tags: tags,
      sbom,
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
