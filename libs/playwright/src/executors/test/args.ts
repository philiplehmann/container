import type { PlaywrightTestExecutorSchema } from './schema';

export const playwrightTestArgs = ({
  testFiles = [],
  config,
  project = [],
  grep,
  grepInvert,
  headed,
  debug,
  ui,
  workers,
  retries,
  repeatEach,
  maxFailures,
  timeout,
  reporter,
  outputDir,
  shard,
  updateSnapshots,
  forbidOnly,
  passWithNoTests,
  lastFailed,
  list,
}: PlaywrightTestExecutorSchema): string[] => {
  const args = ['test'];

  if (config) {
    args.push(`--config=${config}`);
  }
  for (const name of project) {
    args.push(`--project=${name}`);
  }
  if (grep) {
    args.push(`--grep=${grep}`);
  }
  if (grepInvert) {
    args.push(`--grep-invert=${grepInvert}`);
  }
  if (headed) {
    args.push('--headed');
  }
  if (debug) {
    args.push('--debug');
  }
  if (ui) {
    args.push('--ui');
  }
  if (workers != null) {
    args.push(`--workers=${workers}`);
  }
  if (retries != null) {
    args.push(`--retries=${retries}`);
  }
  if (repeatEach != null) {
    args.push(`--repeat-each=${repeatEach}`);
  }
  if (maxFailures != null) {
    args.push(`--max-failures=${maxFailures}`);
  }
  if (timeout != null) {
    args.push(`--timeout=${timeout}`);
  }
  if (reporter) {
    args.push(`--reporter=${reporter}`);
  }
  if (outputDir) {
    args.push(`--output=${outputDir}`);
  }
  if (shard) {
    args.push(`--shard=${shard}`);
  }
  if (updateSnapshots) {
    args.push(`--update-snapshots=${updateSnapshots}`);
  }
  if (forbidOnly) {
    args.push('--forbid-only');
  }
  if (passWithNoTests) {
    args.push('--pass-with-no-tests');
  }
  if (lastFailed) {
    args.push('--last-failed');
  }
  if (list) {
    args.push('--list');
  }

  args.push(...testFiles);

  return args;
};
