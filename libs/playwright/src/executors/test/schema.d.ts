export interface PlaywrightTestExecutorSchema {
  testFiles?: string[]; // Only run test files matching these regular expressions
  config?: string; // Configuration file, relative to the project root
  project?: string[]; // Only run tests from these projects of the config
  grep?: string; // Only run tests matching this regular expression
  grepInvert?: string; // Only run tests not matching this regular expression
  headed?: boolean; // Run tests in headed browsers
  debug?: boolean; // Run tests with Playwright Inspector
  ui?: boolean; // Run tests in interactive UI mode
  workers?: number | string; // Number of concurrent workers or percentage of logical CPU cores
  retries?: number; // Maximum retry count for flaky tests
  repeatEach?: number; // Run each test N times
  maxFailures?: number; // Stop after the first N failures
  timeout?: number; // Test timeout threshold in milliseconds
  reporter?: string; // Reporter to use, comma-separated
  outputDir?: string; // Folder for output artifacts
  shard?: string; // Shard tests and execute only the selected shard, e.g. "1/3"
  updateSnapshots?: 'all' | 'changed' | 'missing' | 'none'; // Update snapshots with actual results
  forbidOnly?: boolean; // Fail if test.only is called
  passWithNoTests?: boolean; // Make test run succeed even if no tests were found
  lastFailed?: boolean; // Only re-run the failures
  list?: boolean; // Collect all the tests and report them, but do not run
  env?: Record<string, string>; // Environment variables to set for the test process
}
