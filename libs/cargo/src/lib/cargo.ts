import { resolve } from 'node:path';
import type { ExecutorContext } from '@nx/devkit';
import { projectRoot, promiseSpawn } from '@riwi/nx';

/** Options every cargo executor accepts. */
export interface CargoCommonOptions {
  /** Rustup toolchain, run as `cargo +<toolchain>`. Without it the project's rust-toolchain.toml applies. */
  toolchain?: string;
  /** Path to Cargo.toml, `{projectRoot}` and `{workspaceRoot}` are replaced. Default: `{projectRoot}/Cargo.toml`. */
  manifestPath?: string;
  /** Package to select (`--package`). */
  package?: string;
  /** Require Cargo.lock to be up to date (`--locked`). */
  locked?: boolean;
  /** Require Cargo.lock and the cache to be up to date, no network (`--frozen`). */
  frozen?: boolean;
  /** Run without network access (`--offline`). */
  offline?: boolean;
  /** Target triple (`--target`). */
  target?: string;
  /** Directory for all generated artifacts (`--target-dir`). */
  targetDir?: string;
  /** Extra arguments placed after the cargo subcommand's own flags. */
  args?: string[];
  /** Environment variables for the cargo process. */
  env?: Record<string, string>;
}

/** Options of the executors that compile code. */
export interface CargoCompileOptions extends CargoCommonOptions {
  /** Build in release mode (`--release`). */
  release?: boolean;
  /** Build with the given profile (`--profile`). */
  profile?: string;
  /** Features to activate (`--features`). */
  features?: string[];
  /** Activate all features (`--all-features`). */
  allFeatures?: boolean;
  /** Do not activate the `default` feature (`--no-default-features`). */
  noDefaultFeatures?: boolean;
}

type Flags = Partial<CargoCompileOptions>;

/** The global flags cargo understands after most subcommands. */
export const commonArgs = (
  { manifestPath, package: pkg, locked, frozen, offline, target, targetDir }: Flags,
  replace: (path: string) => string = (p) => p,
): string[] => {
  const args: string[] = ['--manifest-path', replace(manifestPath ?? '{projectRoot}/Cargo.toml')];
  if (pkg) {
    args.push('--package', pkg);
  }
  if (locked) {
    args.push('--locked');
  }
  if (frozen) {
    args.push('--frozen');
  }
  if (offline) {
    args.push('--offline');
  }
  if (target) {
    args.push('--target', target);
  }
  if (targetDir) {
    args.push('--target-dir', replace(targetDir));
  }
  return args;
};

/** Profile and feature selection flags of the compiling subcommands. */
export const compileArgs = ({ release, profile, features, allFeatures, noDefaultFeatures }: Flags): string[] => {
  if (release && profile) {
    throw new Error('cargo: `release` and `profile` cannot be used together');
  }
  const args: string[] = [];
  if (release) {
    args.push('--release');
  }
  if (profile) {
    args.push('--profile', profile);
  }
  if (features && features.length > 0) {
    args.push('--features', features.join(','));
  }
  if (allFeatures) {
    args.push('--all-features');
  }
  if (noDefaultFeatures) {
    args.push('--no-default-features');
  }
  return args;
};

/**
 * Run `cargo <subcommand> <args…>` in the project root (so its rust-toolchain.toml is used).
 * `trailing` is appended after `--` (arguments for the test harness, clippy or the binary).
 */
export const runCargo = async (
  context: ExecutorContext,
  subcommand: string[],
  args: string[],
  { toolchain, env, args: extra = [] }: CargoCommonOptions,
  trailing: string[] = [],
): Promise<{ success: boolean }> => {
  const cargoArgs = [...(toolchain ? [`+${toolchain}`] : []), ...subcommand, ...args, ...extra];
  if (trailing.length > 0) {
    cargoArgs.push('--', ...trailing);
  }
  try {
    await promiseSpawn('cargo', cargoArgs, {
      cwd: resolve(context.root, projectRoot(context)),
      env: { ...process.env, ...env },
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
};

/**
 * Replace `{projectRoot}` and `{workspaceRoot}` with absolute paths. Other relative paths are left
 * as they are, so they resolve against the project root, where cargo runs.
 */
export const pathReplacer = (context: Pick<ExecutorContext, 'root' | 'projectName' | 'projectGraph'>) => {
  const workspaceRoot = context.root;
  const root = resolve(workspaceRoot, projectRoot(context as ExecutorContext));
  return (path: string) => path.replaceAll('{projectRoot}', root).replaceAll('{workspaceRoot}', workspaceRoot);
};
