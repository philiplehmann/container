import type { ExecutorContext } from '@nx/devkit';
import { envForDockerFile } from './docker-helper';

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
