export interface NodeTestExecutorSchema {
  include?: string; // glob pattern for test files to include
  exclude?: string; // glob pattern for test files to exclude
  concurrency?: number; // specify test runner concurrency
  coverageBranches?: number; // the branch coverage minimum threshold
  coverageExclude?: string[]; // exclude files from coverage report that match this glob pattern
  coverageFunctions?: number; // the function coverage minimum threshold
  coverageInclude?: string[]; // include files in coverage report that match this glob pattern
  coverageLines?: number; // the line coverage minimum threshold
  forceExit?: boolean; // force test runner to exit upon completion
  globalSetup?: string; // specifies the path to the global setup file
  testIsolation?: 'none' | 'vm' | 'process'; // configures the type of test isolation used in the test runner
  namePattern?: string; // run tests whose name matches this regular expression
  only?: boolean; // run tests with 'only' option set
  reporter?: string; // report test output using the given reporter
  reporterDestination?: string; // report given reporter to the given destination
  rerunFailures?: string; // specifies the path to the rerun state file
  shard?: string; // run test at specific shard
  skipPattern?: string; // run tests whose name do not match this regular expression
  timeout?: number; // specify test runner timeout
  updateSnapshots?: boolean; // regenerate test snapshots
  allowEmptySuite?: boolean; // allow test runner to complete with no tests found
}
