import { type SpawnOptions, spawn } from 'node:child_process';
import { arch } from 'node:os';
import { dirname, resolve as pathResolve } from 'node:path';
import { config } from 'dotenv';

export type DockerPlatform = 'amd64' | 'arm64';

export function dockerSpawn(args: string[], options?: Omit<SpawnOptions, 'stdio'>) {
  console.info('spawn:', 'docker', ...args);
  return spawn('docker', args, { ...options, stdio: 'inherit' });
}

export function envForDockerFile(file: string) {
  const { error, parsed } = config({ path: pathResolve(dirname(file), '.env.docker'), processEnv: {} });
  if (error) {
    throw error;
  }
  return parsed ?? {};
}

export const archMapping = {
  x64: 'amd64',
  arm64: 'arm64',
} as const;

export const currentArch = () => {
  if (isDockerPlatform(process.env.PLATFORM)) {
    return process.env.PLATFORM;
  }
  const myArch = arch();
  if (myArch !== 'x64' && myArch !== 'arm64') {
    throw new Error('Unsupported platform');
  }
  return archMapping[myArch];
};

export const isDockerPlatform = (platform: unknown): platform is DockerPlatform => {
  return Object.values<unknown>(archMapping).includes(platform);
};
