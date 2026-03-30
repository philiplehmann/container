import type { ProjectGraph } from '@nx/devkit';
import { createTags, isAutoTags, versionFromEnv, versionFromPackageJson } from './version';

type AutoTagDeps = {
  createTags: typeof createTags;
  isAutoTags: typeof isAutoTags;
  versionFromEnv: typeof versionFromEnv;
  versionFromPackageJson: typeof versionFromPackageJson;
};

const defaultDeps: AutoTagDeps = {
  createTags,
  isAutoTags,
  versionFromEnv,
  versionFromPackageJson,
};

const formatDate = (yearLength: 2 | 4 = 2) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-yearLength);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
const formatVersion = (version: string) =>
  version
    .replace(/^v/, '')
    .replace(/^[~^<>=\s]+/, '')
    .split('-')
    .shift() ?? '';
export const autoTagFormat = (
  {
    tags,
    file,
    versionSource,
    versionSourceEnv,
    versionSourcePackage,
    versionFormat,
    projectName,
    root,
    projectGraph,
  }: {
    tags: string[];
    file: string;
    versionSource?: 'env' | 'packageJson' | 'custom';
    versionSourceEnv?: string;
    versionSourcePackage?: string;
    versionFormat?: string;
    projectName?: string;
    root: string;
    projectGraph: ProjectGraph;
  },
  deps: AutoTagDeps = defaultDeps,
) => {
  const {
    createTags: createTagsImpl,
    isAutoTags: isAutoTagsImpl,
    versionFromEnv: versionFromEnvImpl,
    versionFromPackageJson: versionFromPackageJsonImpl,
  } = deps;

  if (isAutoTagsImpl(tags)) {
    if (versionSource === 'env') {
      if (!versionSourceEnv) throw new Error('versionSourceEnv is required when versionSource is env');
      return createTagsImpl(tags, formatVersion(versionFromEnvImpl(file, versionSourceEnv)));
    }
    if (versionSource === 'packageJson') {
      if (!versionSourcePackage) throw new Error('versionSourcePackage is required when versionSource is packageJson');
      return createTagsImpl(
        tags,
        formatVersion(versionFromPackageJsonImpl(versionSourcePackage, { projectGraph, root })),
      );
    }
    if (versionSource === 'custom') {
      if (!versionFormat) throw new Error('versionSourcePackage is required when versionSource is packageJson');
      const format: Partial<Record<string, string>> = {
        ...process.env,
        YY_MM_DD: formatDate(2),
        YYYY_MM_DD: formatDate(4),
        PROJECT_NAME: projectName || '',
      };
      const formatted = versionFormat.replace(/\$\{([^}|]+)(?:\|([^}]*))?\}/g, (_match, rawKey, rawDefault) => {
        const key = String(rawKey).trim();
        const defaultValue = rawDefault ?? '';
        const value = format[key];

        // use env value when present and non-empty, otherwise fallback to default
        return value !== undefined && value !== null && String(value) !== '' ? String(value) : defaultValue;
      });
      return createTagsImpl(tags, formatted);
    }
    throw new Error('versionSource must be one of: env, packageJson, custom if tag is auto');
  }
  return tags;
};
