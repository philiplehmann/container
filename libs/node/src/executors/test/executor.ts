import { existsSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promiseSpawn } from '@container/docker';
import { projectRoot } from '@container/nx';
import type { Executor } from '@nx/devkit';
import type { NodeTestExecutorSchema } from './schema';

const asyncToArray = async <T>(asyncIterable: AsyncIterable<T>): Promise<T[]> => {
  const results = [];
  for await (const item of asyncIterable) {
    results.push(item);
  }
  return results;
};

const possibleTsConfigs = [
  'tsconfig.spec.json',
  'tsconfig.base.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.lib.json',
];

const nodeTestExecutor: Executor<NodeTestExecutorSchema> = async (
  {
    include: includePattern = '**/*.spec.ts',
    exclude: excludePattern = '**/e2e/**',
    concurrency,
    coverageBranches,
    coverageExclude,
    coverageFunctions,
    coverageInclude,
    coverageLines,
    forceExit,
    globalSetup,
    testIsolation,
    namePattern,
    only,
    reporter,
    reporterDestination,
    rerunFailures,
    shard,
    skipPattern,
    timeout,
    updateSnapshots,
    allowEmptySuite = true,
    tsconfig = 'tsconfig.spec.json',
  },
  context,
) => {
  const root = projectRoot(context);

  if (existsSync(resolve(root, tsconfig))) {
    for (const config in possibleTsConfigs) {
      if (existsSync(resolve(root, config))) {
        tsconfig = config;
        break;
      }
    }
  }

  try {
    const args = ['--require', '@swc-node/register', '--test'];

    const hasCoverageOptions =
      coverageBranches != null ||
      coverageFunctions != null ||
      coverageLines != null ||
      coverageExclude ||
      coverageInclude;

    if (hasCoverageOptions) {
      args.push('--experimental-test-coverage');
    }
    if (concurrency != null) {
      args.push(`--test-concurrency=${concurrency}`);
    }
    if (coverageBranches != null) {
      args.push(`--test-coverage-branches=${coverageBranches}`);
    }
    if (coverageExclude) {
      coverageExclude.forEach((pattern) => {
        args.push(`--test-coverage-exclude=${pattern}`);
      });
    }
    if (coverageFunctions != null) {
      args.push(`--test-coverage-functions=${coverageFunctions}`);
    }
    if (coverageInclude) {
      coverageInclude.forEach((pattern) => {
        args.push(`--test-coverage-include=${pattern}`);
      });
    }
    if (coverageLines != null) {
      args.push(`--test-coverage-lines=${coverageLines}`);
    }
    if (forceExit) {
      args.push('--test-force-exit');
    }
    if (globalSetup) {
      args.push(`--test-global-setup=${globalSetup}`);
    }
    if (testIsolation) {
      args.push(`--test-isolation=${testIsolation}`);
    }
    if (namePattern) {
      args.push(`--test-name-pattern=${namePattern}`);
    }
    if (only) {
      args.push('--test-only');
    }
    if (reporter) {
      args.push(`--test-reporter=${reporter}`);
    }
    if (reporterDestination) {
      args.push(`--test-reporter-destination=${reporterDestination}`);
    }
    if (rerunFailures) {
      args.push(`--test-rerun-failures=${rerunFailures}`);
    }
    if (shard) {
      args.push(`--test-shard=${shard}`);
    }
    if (skipPattern) {
      args.push(`--test-skip-pattern=${skipPattern}`);
    }
    if (timeout != null) {
      args.push(`--test-timeout=${timeout}`);
    }
    if (updateSnapshots) {
      args.push('--test-update-snapshots');
    }

    const includeFiles = await asyncToArray(glob(resolve(root ?? context.root, includePattern)));
    const excludeFiles = await asyncToArray(glob(resolve(root ?? context.root, excludePattern)));
    const withoutExcluded = includeFiles.filter((p) => !excludeFiles.includes(p));

    if (withoutExcluded.length === 0) {
      if (allowEmptySuite) {
        return { success: true, message: 'No non-e2e spec files found, but allowing empty suite to pass.' };
      }
      return { success: false, message: 'No non-e2e spec files found' };
    }

    args.push(...withoutExcluded);

    console.log(
      `Executing tests for project in ${root ?? context.root} with tsconfig ${tsconfig} with tests: [${withoutExcluded.join(',')}]`,
    );
    await promiseSpawn('node', args, {
      env: { ...process.env, SWC_NODE_PROJECT: tsconfig },
      cwd: root ?? context.root,
    });
    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
    };
  }
};

export default nodeTestExecutor;
