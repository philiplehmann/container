import { describe, expect, it } from 'bun:test';
import { playwrightTestArgs } from './args';

describe('playwrightTestArgs', () => {
  it('runs all tests without options', () => {
    expect(playwrightTestArgs({})).toEqual(['test']);
  });

  it('passes projects as repeated flags and test files as positional filters', () => {
    expect(playwrightTestArgs({ project: ['chromium', 'firefox'], testFiles: ['src/e2e/snapshot.spec.ts'] })).toEqual([
      'test',
      '--project=chromium',
      '--project=firefox',
      'src/e2e/snapshot.spec.ts',
    ]);
  });

  it('maps options to playwright cli flags', () => {
    expect(
      playwrightTestArgs({
        config: 'playwright.ci.config.ts',
        grep: '@smoke',
        grepInvert: '@slow',
        headed: true,
        workers: '50%',
        retries: 0,
        repeatEach: 2,
        maxFailures: 1,
        timeout: 30000,
        reporter: 'list,html',
        outputDir: 'test-results',
        shard: '1/3',
        updateSnapshots: 'changed',
        forbidOnly: true,
        passWithNoTests: true,
        lastFailed: true,
        list: true,
      }),
    ).toEqual([
      'test',
      '--config=playwright.ci.config.ts',
      '--grep=@smoke',
      '--grep-invert=@slow',
      '--headed',
      '--workers=50%',
      '--retries=0',
      '--repeat-each=2',
      '--max-failures=1',
      '--timeout=30000',
      '--reporter=list,html',
      '--output=test-results',
      '--shard=1/3',
      '--update-snapshots=changed',
      '--forbid-only',
      '--pass-with-no-tests',
      '--last-failed',
      '--list',
    ]);
  });

  it('skips boolean flags that are false', () => {
    expect(playwrightTestArgs({ headed: false, debug: false, ui: false, forbidOnly: false })).toEqual(['test']);
  });
});
