import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime } from 'bun:test';
import type { ProjectGraph } from '@nx/devkit';

// Mock dependencies used by autoTagFormat
const mocks = {
  isAutoTags: mock((tags: string[]) => tags.length === 1 && tags[0]?.endsWith(':auto')),
  createTags: mock((tags: string[], version: string) => tags.map((t) => t.replace('auto', version))),
  versionFromEnv: mock((_file: string, _envName: string) => 'v1.2.3'),
  versionFromPackageJson: mock((_pkg: string, _opts: { projectGraph: ProjectGraph }) => 'v2.3.4-beta.1'),
};

mock.module('./version', () => ({
  isAutoTags: mocks.isAutoTags,
  createTags: mocks.createTags,
  versionFromEnv: mocks.versionFromEnv,
  versionFromPackageJson: mocks.versionFromPackageJson,
}));

import { autoTagFormat } from './autoTagFormat';

const projectGraph = {} as ProjectGraph;

describe('autoTagFormat', () => {
  beforeEach(() => {
    setSystemTime();
  });

  afterEach(() => {
    mocks.isAutoTags.mockReset();
    mocks.createTags.mockReset();
    mocks.versionFromEnv.mockReset();
    mocks.versionFromPackageJson.mockReset();

    mocks.isAutoTags.mockImplementation((tags: string[]) => tags.length === 1 && tags[0]?.endsWith(':auto'));
    mocks.createTags.mockImplementation((tags: string[], version: string) =>
      tags.map((t) => t.replace('auto', version)),
    );
    mocks.versionFromEnv.mockImplementation((_file: string, _envName: string) => 'v1.2.3');
    mocks.versionFromPackageJson.mockImplementation(
      (_pkg: string, _opts: { projectGraph: ProjectGraph }) => 'v2.3.4-beta.1',
    );

    delete process.env.TEST_BUILD;
    delete process.env.EMPTY_ENV;
  });

  it('returns original tags when tags are not auto', () => {
    const tags = ['repo:latest', 'repo:stable'];
    const result = autoTagFormat({
      tags,
      file: 'Dockerfile',
      projectGraph,
    });

    expect(result).toEqual(tags);
    expect(mocks.createTags).not.toHaveBeenCalled();
  });

  it('formats version from env source and strips leading v', () => {
    mocks.versionFromEnv.mockImplementationOnce(() => 'v1.2.3');

    const tags = ['repo:auto'];
    const result = autoTagFormat({
      tags,
      file: 'Dockerfile',
      versionSource: 'env',
      versionSourceEnv: 'TEST_BUILD',
      projectGraph,
    });

    expect(mocks.versionFromEnv).toHaveBeenCalledWith('Dockerfile', 'TEST_BUILD');
    expect(mocks.createTags).toHaveBeenCalledWith(tags, '1.2.3');
    expect(result).toEqual(['repo:1.2.3']);
  });

  it('throws when env source is selected without versionSourceEnv', () => {
    expect(() =>
      autoTagFormat({
        tags: ['repo:auto'],
        file: 'Dockerfile',
        versionSource: 'env',
        projectGraph,
      }),
    ).toThrow('versionSourceEnv is required when versionSource is env');
  });

  it('formats version from packageJson source and drops prerelease suffix', () => {
    mocks.versionFromPackageJson.mockImplementationOnce(() => 'v3.4.5-rc.0');

    const tags = ['repo:auto'];
    const result = autoTagFormat({
      tags,
      file: 'Dockerfile',
      versionSource: 'packageJson',
      versionSourcePackage: 'libs/docker/package.json',
      projectGraph,
    });

    expect(mocks.versionFromPackageJson).toHaveBeenCalledWith('libs/docker/package.json', { projectGraph });
    expect(mocks.createTags).toHaveBeenCalledWith(tags, '3.4.5');
    expect(result).toEqual(['repo:3.4.5']);
  });

  it('throws when packageJson source is selected without versionSourcePackage', () => {
    expect(() =>
      autoTagFormat({
        tags: ['repo:auto'],
        file: 'Dockerfile',
        versionSource: 'packageJson',
        projectGraph,
      }),
    ).toThrow('versionSourcePackage is required when versionSource is packageJson');
  });

  it('formats custom source using env, project name and default placeholders', () => {
    process.env.TEST_BUILD = 'build42';

    const tags = ['repo:auto'];
    const result = autoTagFormat({
      tags,
      file: 'Dockerfile',
      versionSource: 'custom',
      versionFormat: 'v${PROJECT_NAME}-${TEST_BUILD}-${MISSING|fallback}',
      projectName: 'docker-lib',
      projectGraph,
    });

    expect(mocks.createTags).toHaveBeenCalledWith(tags, 'vdocker-lib-build42-fallback');
    expect(result).toEqual(['repo:vdocker-lib-build42-fallback']);
  });

  it('uses default for empty env values in custom placeholders', () => {
    process.env.EMPTY_ENV = '';

    const tags = ['repo:auto'];
    const result = autoTagFormat({
      tags,
      file: 'Dockerfile',
      versionSource: 'custom',
      versionFormat: 'v${EMPTY_ENV|defaultValue}',
      projectGraph,
    });

    expect(mocks.createTags).toHaveBeenCalledWith(tags, 'vdefaultValue');
    expect(result).toEqual(['repo:vdefaultValue']);
  });

  it('supports date placeholders in custom format', () => {
    setSystemTime(new Date('2024-07-09T10:00:00.000Z'));

    const tags = ['repo:auto'];
    const result = autoTagFormat({
      tags,
      file: 'Dockerfile',
      versionSource: 'custom',
      versionFormat: '${YY_MM_DD}',
      projectGraph,
    });

    expect(mocks.createTags).toHaveBeenCalledWith(tags, '24-07-09');
    expect(result).toEqual(['repo:24-07-09']);
  });

  it('throws when auto tags are used with invalid versionSource', () => {
    expect(() =>
      autoTagFormat({
        tags: ['repo:auto'],
        file: 'Dockerfile',
        versionSource: 'invalid' as 'env',
        projectGraph,
      }),
    ).toThrow('versionSource must be one of: env, packageJson, custom if tag is auto');
  });
});
