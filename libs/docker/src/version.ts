import type { ExecutorContext } from '@nx/devkit';
import { envForDockerFile } from './docker-helper';
import { getRequirementsPath } from './getRequirementsPath';
import { readFile } from './readFile';
export const versionFromPackageJson = (
  packageName: string,
  { projectGraph }: Pick<ExecutorContext, 'projectGraph'>,
) => {
  const { version } = projectGraph?.externalNodes?.[`npm:${packageName}`]?.data ?? {};
  if (!version) throw new Error(`can not find ${packageName} version`);
  return version;
};

export const versionFromEnv = (dockerFile: string, env: string, parser: (version: string) => string = (v) => v) => {
  const version = envForDockerFile(dockerFile)[env];

  if (!version) {
    throw new Error(`can not find ${env} in .env.docker`);
  }
  return parser(version);
};

export const versionFromRequirements = (dockerfile: string, lib: string) => {
  const requirements = getRequirementsPath(dockerfile);
  const [, version] =
    readFile(requirements)
      .split('\n')
      .map((line) => line.split('#')[0]?.trim() || '') // Remove inline comments and trim
      .map((line) => line.split('==').map((part) => part.trim())) // Trim both name and version
      .find(([name]) => name === lib) || [];
  if (version) {
    return version;
  }
  throw new Error(`can not find ${lib} in ${requirements}`);
};

export const tagToRepository = (tag = '') => {
  const repository = tag.split(':').shift();
  if (!repository) throw new Error('repository not found in tag');
  return repository;
};

export const isAutoTags = (tags: string[]) => (tags.length === 1 && tags[0]?.endsWith(':auto')) ?? false;

export const createTags = (tags: string[], version: string, runId = process.env.GITHUB_RUN_NUMBER ?? 'local') => {
  const versionParts = version.split('.');
  const repository = tagToRepository(tags[0]);

  return versionParts
    .flatMap((_, index) => {
      const tag = `${repository}:${versionParts.slice(0, index + 1).join('.')}`;

      return [tag, `${tag}-${runId}`];
    })
    .concat(`${repository}:latest`);
};
