import type { Executor } from '@nx/devkit';
import { dockerBuildxBuild } from '../../docker-buildx-build';
import { createTags, isAutoTags, versionFromEnv, versionFromPackageJson } from '../../version';
import type { DockerBuildExecutorSchema } from './schema';

const runExecutor: Executor<DockerBuildExecutorSchema> = async (
  { file, tags = [], platforms },
  { projectName, projectGraph },
) => {
  if (isAutoTags(tags)) {
    switch (projectName) {
      case 'mailcatcher':
        tags = createTags(tags, versionFromEnv(file, 'MAILCATCHER_VERSION'));
        break;
      case 'maildev':
        tags = createTags(
          tags,
          versionFromEnv(file, 'MAILDEV_VERSION', (v) => v.replace('v', '')),
        );
        break;
      case 'mailhog':
        tags = createTags(
          tags,
          versionFromEnv(file, 'MAILHOG_VERSION', (v) => v.replace('v', '')),
        );
        break;
      case 'poppler':
        tags = createTags(
          tags,
          versionFromEnv(file, 'POPPLER_VERSION', (v) => v.split('-').shift() ?? ''),
        );
        break;
      case 'puppeteer':
        tags = createTags(tags, versionFromPackageJson('puppeteer-core', { projectGraph }));
        break;
      case 'tesseract':
        tags = createTags(
          tags,
          versionFromEnv(file, 'TESSERACT_VERSION', (v) => v.split('-').shift() ?? ''),
        );
        break;
      case 'unoserver':
        tags = createTags(tags, versionFromEnv(file, 'UNOSERVER_VERSION'));
        break;
      case 'pdftk':
        tags = createTags(tags, versionFromEnv(file, 'PDFTK_VERSION'));
        break;
      case 'nx-cache-server':
        tags = createTags(tags, versionFromEnv(file, 'NX_CACHE_SERVER_VERSION'));
        break;
    }
  }
  try {
    await dockerBuildxBuild({
      platforms: platforms,
      output: 'push',
      file,
      tags: tags,
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
