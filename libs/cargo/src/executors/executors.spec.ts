import { describe, expect, it } from 'bun:test';
import { buildArgs } from './build/executor';
import { formatArgs } from './format/executor';
import { clippyArgs } from './lint/executor';
import { testArgs } from './test/executor';

describe('cargo executor args', () => {
  it('build selects binaries', () => {
    expect(buildArgs({ bin: ['a', 'b'], allTargets: true })).toEqual(['--bin', 'a', '--bin', 'b', '--all-targets']);
  });

  it('test puts the name filter last', () => {
    expect(testArgs({ noFailFast: true, doc: true, testName: 'converts' })).toEqual([
      '--no-fail-fast',
      '--doc',
      'converts',
    ]);
  });

  it('clippy lints all targets by default', () => {
    expect(clippyArgs({})).toEqual(['--all-targets']);
    expect(clippyArgs({ fix: true, allTargets: false })).toEqual(['--fix', '--allow-dirty', '--allow-staged']);
  });

  it('fmt checks', () => {
    expect(formatArgs({ check: true, package: 'pkg' })).toEqual([
      '--manifest-path',
      '{projectRoot}/Cargo.toml',
      '--package',
      'pkg',
      '--check',
    ]);
  });
});
