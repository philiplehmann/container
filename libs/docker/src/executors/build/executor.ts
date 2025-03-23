import type { Executor } from '@nx/devkit';
import { dockerBuildxBuild } from '../../docker-buildx-build';
import { createTags, isAutoTags, versionFromEnv, versionFromPackageJson, versionFromRequirements } from '../../version';
import type { DockerBuildExecutorSchema } from './schema';

const runExecutor: Executor<DockerBuildExecutorSchema> = async (
  { file: dockerfile, tags = [], platforms },
  { projectName, projectGraph },
) => {
  if (isAutoTags(tags)) {
    switch (projectName) {
      case 'mailcatcher':
        tags = createTags(tags, versionFromEnv(dockerfile, 'MAILCATCHER_VERSION'));
        break;
      case 'maildev':
        tags = createTags(
          tags,
          versionFromEnv(dockerfile, 'MAILDEV_VERSION', (v) => v.replace('v', '')),
        );
        break;
      case 'mailhog':
        tags = createTags(
          tags,
          versionFromEnv(dockerfile, 'MAILHOG_VERSION', (v) => v.replace('v', '')),
        );
        break;
      case 'poppler':
        tags = createTags(
          tags,
          versionFromEnv(dockerfile, 'POPPLER_VERSION', (v) => v.split('-').shift() ?? ''),
        );
        break;
      case 'puppeteer':
        tags = createTags(tags, versionFromPackageJson('puppeteer-core', { projectGraph }));
        break;
      case 'tesseract':
        tags = createTags(
          tags,
          versionFromEnv(dockerfile, 'TESSERACT_VERSION', (v) => v.split('-').shift() ?? ''),
        );
        break;
      case 'unoserver':
        tags = createTags(tags, versionFromEnv(dockerfile, 'UNOSERVER_VERSION'));
        break;
      case 'pdftk':
        tags = createTags(tags, versionFromEnv(dockerfile, 'PDFTK_VERSION'));
        break;
      case 'nx-cache-server':
        tags = createTags(tags, versionFromEnv(file, 'NX_CACHE_SERVER_VERSION'));
      case 'easyocr':
        tags = createTags(tags, versionFromRequirements(dockerfile, 'easyocr'));
        break;
    }
  }
  try {
    await dockerBuildxBuild({
      platforms: platforms,
      output: 'push',
      file: dockerfile,
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
