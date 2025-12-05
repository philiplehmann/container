import { promiseSpawn } from '@container/docker';
import type { Executor } from '@nx/devkit';
import type { NodeTestExecutorSchema } from './schema';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { glob } from 'node:fs/promises';

const asyncToArray = async <T>(asyncIterable: AsyncIterable<T>): Promise<T[]> => {
  const results = [];
  for await (const item of asyncIterable) {
    results.push(item);
  }
  return results;
};

const nodeTestExecutor: Executor<NodeTestExecutorSchema> = async (
  {
    path,
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
  },
  context,
) => {
  const root =
    context.projectName && context.projectGraph ? context.projectGraph.nodes[context.projectName].data.root : '';
  let tsconfig = root ? './tsconfig.spec.json' : './tsconfig.base.json';
  console.log('Checking tsconfig at:', tsconfig);
  if (existsSync(resolve(root, tsconfig)) === false) {
    tsconfig = './tsconfig.app.json';
  }
  if (existsSync(resolve(root, tsconfig)) === false) {
    tsconfig = './tsconfig.lib.json';
  }
  if (existsSync(resolve(root, tsconfig)) === false) {
    tsconfig = './tsconfig.json';
  }
  if (existsSync(resolve(root, tsconfig)) === false) {
    tsconfig = './tsconfig.base.json';
  }

  try {
    const args = ['--require', '@swc-node/register', '--test'];
    if (concurrency) {
      args.push(`--test-concurrency=${concurrency}`);
    }
    if (coverageBranches) {
      args.push(`--test-coverage-branches=${coverageBranches}`);
    }
    if (coverageExclude) {
      coverageExclude.forEach((pattern) => {
        args.push(`--test-coverage-exclude=${pattern}`);
      });
    }
    if (coverageFunctions) {
      args.push(`--test-coverage-functions=${coverageFunctions}`);
    }
    if (coverageInclude) {
      coverageInclude.forEach((pattern) => {
        args.push(`--test-coverage-include=${pattern}`);
      });
    }
    if (coverageLines) {
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
    if (timeout) {
      args.push(`--test-timeout=${timeout}`);
    }
    if (updateSnapshots) {
      args.push('--test-update-snapshots');
    }
    if (path) {
      args.push(path);
    } else {
      const files = await asyncToArray(glob(resolve(root ?? context.root, '**/*.spec.ts')));
      const withoutE2E = files.filter((p) => !p.includes('/e2e/') && !p.includes('\\e2e\\'));

      if (withoutE2E.length === 0) {
        console.error('No non-e2e spec files found');
        process.exit(1);
      }

      args.push(...withoutE2E);
    }
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
