import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime } from 'bun:test';
import type { ProjectGraph } from '@nx/devkit';
import { autoTagFormat } from './autoTagFormat';

const projectGraph = {} as ProjectGraph;

type VersionModuleMocks = {
  isAutoTags: ReturnType<typeof mock>;
  createTags: ReturnType<typeof mock>;
  versionFromEnv: ReturnType<typeof mock>;
  versionFromPackageJson: ReturnType<typeof mock>;
};

let mocks: VersionModuleMocks;

const setupVersionMocks = () => {
  mocks = {
    isAutoTags: mock((tags: string[]) => tags.length === 1 && tags[0]?.endsWith(':auto')),
    createTags: mock((tags: string[], version: string) => tags.map((t) => t.replace('auto', version))),
    versionFromEnv: mock((_file: string, _envName: string) => 'v1.2.3'),
    versionFromPackageJson: mock((_pkg: string, _opts: { projectGraph: ProjectGraph }) => 'v2.3.4-beta.1'),
  };
};

describe('autoTagFormat', () => {
  beforeEach(() => {
    setSystemTime();
    setupVersionMocks();
  });

  afterEach(() => {
    delete process.env.TEST_BUILD;
    delete process.env.EMPTY_ENV;
  });

  it('returns original tags when tags are not auto', () => {
    const tags = ['repo:latest', 'repo:stable'];
    const result = autoTagFormat(
      {
        tags,
        file: 'Dockerfile',
        projectGraph,
        root: '/workspace',
      },
      mocks,
    );

    expect(result).toEqual(tags);
    expect(mocks.createTags).not.toHaveBeenCalled();
  });

  it('formats version from env source and strips leading v', () => {
    mocks.versionFromEnv.mockImplementationOnce(() => 'v1.2.3');

    const tags = ['repo:auto'];
    const result = autoTagFormat(
      {
        tags,
        file: 'Dockerfile',
        versionSource: 'env',
        versionSourceEnv: 'TEST_BUILD',
        projectGraph,
        root: '/workspace',
      },
      mocks,
    );

    expect(mocks.versionFromEnv).toHaveBeenCalledWith('Dockerfile', 'TEST_BUILD');
    expect(mocks.createTags).toHaveBeenCalledWith(tags, '1.2.3');
    expect(result).toEqual(['repo:1.2.3']);
  });

  it('throws when env source is selected without versionSourceEnv', () => {
    expect(() =>
      autoTagFormat(
        {
          tags: ['repo:auto'],
          file: 'Dockerfile',
          versionSource: 'env',
          projectGraph,
          root: '/workspace',
        },
        mocks,
      ),
    ).toThrow('versionSourceEnv is required when versionSource is env');
  });

  it('formats version from packageJson source and drops prerelease suffix', () => {
    mocks.versionFromPackageJson.mockImplementationOnce(() => 'v3.4.5-rc.0');

    const tags = ['repo:auto'];
    const result = autoTagFormat(
      {
        tags,
        file: 'Dockerfile',
        versionSource: 'packageJson',
        versionSourcePackage: 'puppeteer-core',
        root: '/workspace',
        projectGraph,
      },
      mocks,
    );

    expect(mocks.versionFromPackageJson).toHaveBeenCalledWith('puppeteer-core', {
      projectGraph,
      root: '/workspace',
    });
    expect(mocks.createTags).toHaveBeenCalledWith(tags, '3.4.5');
    expect(result).toEqual(['repo:3.4.5']);
  });

  it('formats packageJson ranges by removing semver operators', () => {
    mocks.versionFromPackageJson.mockImplementationOnce(() => '^24.40.0');

    const tags = ['repo:auto'];
    const result = autoTagFormat(
      {
        tags,
        file: 'Dockerfile',
        versionSource: 'packageJson',
        versionSourcePackage: 'puppeteer-core',
        projectGraph,
        root: '/workspace',
      },
      mocks,
    );

    expect(mocks.createTags).toHaveBeenCalledWith(tags, '24.40.0');
    expect(result).toEqual(['repo:24.40.0']);
  });

  it('throws when packageJson source is selected without versionSourcePackage', () => {
    expect(() =>
      autoTagFormat(
        {
          tags: ['repo:auto'],
          file: 'Dockerfile',
          versionSource: 'packageJson',
          projectGraph,
          root: '/workspace',
        },
        mocks,
      ),
    ).toThrow('versionSourcePackage is required when versionSource is packageJson');
  });

  it('formats custom source using env, project name and default placeholders', () => {
    process.env.TEST_BUILD = 'build42';

    const tags = ['repo:auto'];
    const result = autoTagFormat(
      {
        tags,
        file: 'Dockerfile',
        versionSource: 'custom',
        versionFormat: 'v${PROJECT_NAME}-${TEST_BUILD}-${MISSING|fallback}',
        projectName: 'docker-lib',
        projectGraph,
        root: '/workspace',
      },
      mocks,
    );

    expect(mocks.createTags).toHaveBeenCalledWith(tags, 'vdocker-lib-build42-fallback');
    expect(result).toEqual(['repo:vdocker-lib-build42-fallback']);
  });

  it('uses default for empty env values in custom placeholders', () => {
    process.env.EMPTY_ENV = '';

    const tags = ['repo:auto'];
    const result = autoTagFormat(
      {
        tags,
        file: 'Dockerfile',
        versionSource: 'custom',
        versionFormat: 'v${EMPTY_ENV|defaultValue}',
        projectGraph,
        root: '/workspace',
      },
      mocks,
    );

    expect(mocks.createTags).toHaveBeenCalledWith(tags, 'vdefaultValue');
    expect(result).toEqual(['repo:vdefaultValue']);
  });

  it('supports date placeholders in custom format', () => {
    setSystemTime(new Date('2024-07-09T10:00:00.000Z'));

    const tags = ['repo:auto'];
    const result = autoTagFormat(
      {
        tags,
        file: 'Dockerfile',
        versionSource: 'custom',
        versionFormat: '${YY_MM_DD}',
        projectGraph,
        root: '/workspace',
      },
      mocks,
    );

    expect(mocks.createTags).toHaveBeenCalledWith(tags, '24-07-09');
    expect(result).toEqual(['repo:24-07-09']);
  });

  it('throws when auto tags are used with invalid versionSource', () => {
    expect(() =>
      autoTagFormat(
        {
          tags: ['repo:auto'],
          file: 'Dockerfile',
          versionSource: 'invalid' as 'env',
          projectGraph,
          root: '/workspace',
        },
        mocks,
      ),
    ).toThrow('versionSource must be one of: env, packageJson, custom if tag is auto');
  });
});
