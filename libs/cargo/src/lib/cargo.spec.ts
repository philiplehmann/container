import { describe, expect, it } from 'bun:test';
import type { ExecutorContext } from '@nx/devkit';
import { commonArgs, compileArgs, pathReplacer } from './cargo';

const context = {
  root: '/repo',
  projectName: 'app',
  projectGraph: { nodes: { app: { data: { root: 'apps/app' } } } },
} as unknown as ExecutorContext;

describe('commonArgs', () => {
  it('defaults to the project manifest', () => {
    expect(commonArgs({}, pathReplacer(context))).toEqual(['--manifest-path', '/repo/apps/app/Cargo.toml']);
  });

  it('maps every flag', () => {
    expect(
      commonArgs(
        {
          manifestPath: '{workspaceRoot}/Cargo.toml',
          package: 'pkg',
          locked: true,
          frozen: true,
          offline: true,
          target: 'x86_64-unknown-linux-gnu',
          targetDir: '{workspaceRoot}/target',
        },
        pathReplacer(context),
      ),
    ).toEqual([
      '--manifest-path',
      '/repo/Cargo.toml',
      '--package',
      'pkg',
      '--locked',
      '--frozen',
      '--offline',
      '--target',
      'x86_64-unknown-linux-gnu',
      '--target-dir',
      '/repo/target',
    ]);
  });
});

describe('compileArgs', () => {
  it('maps profile and features', () => {
    expect(compileArgs({ release: true, features: ['a', 'b'], allFeatures: true, noDefaultFeatures: true })).toEqual([
      '--release',
      '--features',
      'a,b',
      '--all-features',
      '--no-default-features',
    ]);
  });

  it('rejects release together with profile', () => {
    expect(() => compileArgs({ release: true, profile: 'dist' })).toThrow();
  });

  it('is empty without options', () => {
    expect(compileArgs({})).toEqual([]);
  });
});
