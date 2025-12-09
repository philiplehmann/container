export interface NodeTestExecutorSchema {
  include?: string; // glob pattern for test files to include
  exclude?: string; // glob pattern for test files to exclude
  testNamePattern?: string; // Run only tests with a name that matches the given regex.
  timeout?: number; // Set the per-test timeout in milliseconds, default is 5000.
  updateSnapshots?: boolean; // Update snapshot files
  rerunEach?: number; // Re-run each test file <NUMBER> times, helps catch certain bugs
  todo?: boolean; // Include tests that are marked with "test.todo()"
  only?: boolean; // Run only tests that are marked with "test.only()" or "describe.only()"
  passWithNoTests?: boolean; // Exit with code 0 when no tests are found
  concurrent?: boolean; // Treat all tests as `test.concurrent()` tests
  randomize?: boolean; // Run tests in random order
  seed?: string; // Set the random seed for test randomization
  coverage?: boolean; // Generate a coverage profile
  coverageReporter?: 'text' | 'lcov'; // Report coverage in 'text' and/or 'lcov'. Defaults to 'text'.
  coverageDir?: string; // Directory for coverage files. Defaults to 'coverage'.
  bail?: number; // Exit the test suite after <NUMBER> failures. If you do not specify a number, it defaults to 1.
  reporter?: 'dots' | 'junit'; // Test output reporter format. Available: 'junit' (requires --reporter-outfile), 'dots'. Default: console output.
  reporterOutfile?: string; // Output file path for the reporter format (required with --reporter).
  onlyFailures?: boolean; // Only display test failures, hiding passing tests.
  maxConcurrency?: number; // Maximum number of concurrent tests to execute at once. Default is 20.
}
