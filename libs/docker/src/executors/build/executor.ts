import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Executor } from '@nx/devkit';
import { autoTagFormat, resolveVersion } from '../../autoTagFormat';
import { dockerBuildxBuild } from '../../docker-buildx-build';
import { ociLabels } from '../../oci-metadata';
import type { DockerBuildExecutorSchema } from './schema';

const runExecutor: Executor<DockerBuildExecutorSchema> = async (
  {
    file,
    tags = [],
    platforms,
    versionSource,
    versionSourceEnv,
    versionSourcePackage,
    versionFormat,
    sbom = true,
    provenance = true,
    labels,
    metadataFile,
  },
  { projectName, projectGraph, root },
) => {
  const versionOptions = {
    file,
    versionSource,
    versionSourceEnv,
    versionSourcePackage,
    versionFormat,
    projectName,
    root,
    projectGraph,
  };
  tags = autoTagFormat({ tags, ...versionOptions });
  try {
    if (metadataFile) {
      mkdirSync(dirname(resolve(root, metadataFile)), { recursive: true });
    }
    await dockerBuildxBuild({
      platforms: platforms,
      output: 'push',
      file,
      tags: tags,
      sbom,
      provenance,
      labels: ociLabels({
        title: projectName,
        version: versionSource ? resolveVersion(versionOptions) : undefined,
        root,
        labels,
      }),
      metadataFile: metadataFile ? resolve(root, metadataFile) : undefined,
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
