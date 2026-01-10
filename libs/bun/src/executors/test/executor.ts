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

const bunTestExecutor: Executor<NodeTestExecutorSchema> = async (
  {
    include: includePattern,
    exclude: excludePattern,
    testNamePattern,
    timeout,
    updateSnapshots,
    rerunEach,
    todo,
    only,
    passWithNoTests,
    concurrent,
    randomize,
    seed,
    coverage,
    coverageReporter,
    coverageDir,
    bail,
    reporter,
    reporterOutfile,
    onlyFailures,
    maxConcurrency,
  },
  context,
) => {
  const root = projectRoot(context);
  try {
    const args = ['--bun', 'test'];

    if (only) {
      args.push('--test-only');
    }
    if (reporter) {
      args.push(`--test-reporter=${reporter}`);
    }
    if (rerunEach != null) {
      args.push(`--rerun-each=${rerunEach}`);
    }
    if (todo) {
      args.push('--todo');
    }
    if (concurrent) {
      args.push('--concurrent');
    }
    if (randomize) {
      args.push('--randomize');
    }
    if (seed) {
      args.push(`--seed=${seed}`);
    }
    if (coverage) {
      args.push('--coverage');
    }
    if (coverageReporter) {
      args.push(`--coverage-reporter=${coverageReporter}`);
    }
    if (coverageDir) {
      args.push(`--coverage-dir=${coverageDir}`);
    }
    if (bail != null) {
      args.push(`--bail=${bail}`);
    }
    if (reporterOutfile) {
      args.push(`--reporter-outfile=${reporterOutfile}`);
    }
    if (onlyFailures) {
      args.push('--only-failures');
    }
    if (maxConcurrency != null) {
      args.push(`--max-concurrency=${maxConcurrency}`);
    }
    if (timeout != null) {
      args.push(`--timeout=${timeout}`);
    }
    if (updateSnapshots) {
      args.push('--test-update-snapshots');
    }
    if (testNamePattern) {
      args.push(`--test-name-pattern=${testNamePattern}`);
    }

    const includeFiles = await asyncToArray(glob(resolve(root ?? context.root, includePattern)));
    const excludeFiles = await asyncToArray(glob(resolve(root ?? context.root, excludePattern)));
    const withoutExcluded = includeFiles.filter((p) => !excludeFiles.includes(p));

    if (withoutExcluded.length === 0) {
      if (passWithNoTests) {
        return { success: true, message: 'No spec files found, but allowing empty suite to pass.' };
      }
      return { success: false, message: 'No spec files found' };
    }

    args.push(...withoutExcluded);

    console.log(`Executing tests for project in ${root ?? context.root} with tests: [${withoutExcluded.join(',')}]`);
    await promiseSpawn('bun', args, {
      env: { ...process.env },
      cwd: root,
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

export default bunTestExecutor;
