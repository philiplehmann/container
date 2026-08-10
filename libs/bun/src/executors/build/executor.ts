import { existsSync } from 'node:fs';
import { copyFile, glob } from 'node:fs/promises';
import { resolve } from 'node:path';
import { type Executor, readJsonFile, writeJsonFile } from '@nx/devkit';
import { projectRoot as getProjectRoot, promiseSpawn, replacePlaceholders } from '../../../../nx/src/index.ts';
import type { BunBuildExecutorSchema } from './schema';

type PackageJsonExports = {
  [key: string]: string | { types?: string; default?: string };
};

type PackageJson = {
  name?: string;
  version?: string;
  type?: 'module' | 'commonjs';
  main?: string;
  types?: string;
  typings?: string;
  exports?: PackageJsonExports;
};

const patchBuiltPackageJson = (
  packageJsonPath: string,
  sourcePackageJsonPath: string,
  projectName: string,
  format: BunBuildExecutorSchema['format'],
  projectRoot: string,
  mainEntrypoint: string,
): void => {
  let packageJson: PackageJson;

  if (existsSync(packageJsonPath)) {
    packageJson = readJsonFile<PackageJson>(packageJsonPath);
  } else if (existsSync(sourcePackageJsonPath)) {
    packageJson = readJsonFile<PackageJson>(sourcePackageJsonPath);
  } else {
    packageJson = {
      name: projectName,
      version: '0.0.0',
      type: format === 'esm' ? 'module' : 'commonjs',
    };
  }

  const entryWithoutProjectRoot = mainEntrypoint.replace(`${projectRoot}/`, '');
  const entryBase = entryWithoutProjectRoot.replace(/\.[cm]?[jt]sx?$/, '');
  const mainPath = `./${entryBase}.js`;
  const typesPath = `./${entryBase}.d.ts`;
  const hasProjectPackageJson = existsSync(sourcePackageJsonPath);

  packageJson.main = mainPath;

  if (hasProjectPackageJson) {
    packageJson.types = typesPath;
    packageJson.typings = typesPath;
  }

  packageJson.exports = {
    ...(packageJson.exports ?? {}),
    '.': {
      ...(hasProjectPackageJson ? { types: typesPath } : {}),
      default: mainPath,
    },
    './package.json': './package.json',
  };

  writeJsonFile(packageJsonPath, packageJson);
};

const bunBuildExecutor: Executor<BunBuildExecutorSchema> = async (
  { entrypoints, outdir, target, format, packages, assets },
  context,
) => {
  const replace = replacePlaceholders(context);
  const projectRoot = getProjectRoot(context);
  const globEntrypoints = await Array.fromAsync(glob(entrypoints.map(replace)));
  const globAssets = await Array.fromAsync(glob((assets ?? []).map(replace)));

  const args = [
    'build',
    '--target',
    target,
    '--outdir',
    replace(outdir),
    '--format',
    format,
    '--packages',
    packages,
    '--root',
    resolve(projectRoot),
    ...globEntrypoints,
  ];
  try {
    await promiseSpawn('bun', args, {
      cwd: context.root,
      env: process.env,
    });
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
    return { success: false };
  }

  try {
    await Promise.all(
      globAssets.map((asset) => {
        return copyFile(resolve(context.root, asset), resolve(replace(outdir), asset.replace(`${projectRoot}/`, '')));
      }),
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
    return { success: false };
  }

  try {
    const packageJsonPath = resolve(replace(outdir), 'package.json');
    const sourcePackageJsonPath = resolve(context.root, projectRoot, 'package.json');
    const mainEntrypoint = replace(entrypoints[0] ?? `${projectRoot}/src/index.ts`);
    patchBuiltPackageJson(
      packageJsonPath,
      sourcePackageJsonPath,
      context.projectName ?? projectRoot,
      format,
      projectRoot,
      mainEntrypoint,
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
    return { success: false };
  }
  return { success: true };
};

export default bunBuildExecutor;
