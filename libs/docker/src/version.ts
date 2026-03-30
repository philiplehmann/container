import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExecutorContext } from '@nx/devkit';
import { envForDockerFile } from './docker-helper';

export const versionFromPackageJson = (
  packageName: string,
  { projectGraph, root }: Pick<ExecutorContext, 'projectGraph' | 'root'>,
) => {
  const externalNodes = projectGraph?.externalNodes ?? {};
  const directVersion = externalNodes[`npm:${packageName}`]?.data?.version;

  if (directVersion) return directVersion;

  const externalNodeEntry = Object.entries(externalNodes).find(([nodeName]) =>
    nodeName.startsWith(`npm:${packageName}@`),
  );
  const externalNodeVersion = externalNodeEntry?.[1]?.data?.version;

  if (externalNodeVersion) return externalNodeVersion;

  const packageJsonPath = join(root, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };

    const manifestVersion =
      packageJson.dependencies?.[packageName] ??
      packageJson.devDependencies?.[packageName] ??
      packageJson.peerDependencies?.[packageName] ??
      packageJson.optionalDependencies?.[packageName];

    if (manifestVersion) return manifestVersion;
  }

  throw new Error(`can not find ${packageName} version`);
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
