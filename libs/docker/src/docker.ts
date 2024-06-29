import { spawn, type SpawnOptions } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { arch } from 'node:os';
import { config } from 'dotenv';
import { dirname, resolve as pathResolve } from 'node:path';

export type DockerPlatform = 'amd' | 'arm';

export function promiseSpawn(command: string, args: string[], options?: Omit<SpawnOptions, 'stdio'>) {
  return new Promise<void>((resolve, reject) => {
    console.info('spawn:', command, ...args);
    const docker = spawn(command, args, { ...options, stdio: 'inherit' });
    docker.on('exit', (code) => {
      if (code === 0) {
        return resolve();
      }
      return reject(new Error(`Command ${command} ${args.join(' ')} failed`));
    });
  });
}

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

export function dockerImageRemove(image: string) {
  return new Promise<void>((resolve) => {
    const docker = dockerSpawn(['image', 'rm', image]);
    docker.on('exit', (code) => {
      if (code === 0) {
        console.log(`Image ${image} removed`);
        return resolve();
      }
      console.log(`Image ${image} not found or could not be removed`);
      return resolve();
    });
  });
}

export async function dockerBuildxBuild({
  platforms,
  output,
  file,
  tags,
}: {
  platforms: DockerPlatform[];
  output: 'load' | 'push';
  file: string;
  tags: string[];
}) {
  const builderName = `builder-${platforms.join('-')}-${randomBytes(10).toString('hex')}`;
  try {
    await promiseSpawn('docker', ['buildx', 'create', '--name', builderName, '--platform', 'linux/amd64,linux/arm64']);
    const [registry, tag] = tags[0].split(':');
    const cacheTag = [registry, tag.startsWith('test-') ? `build-cache-${tag}` : 'build-cache'].join(':');
    await new Promise<void>((resolve, reject) => {
      const processEnv = envForDockerFile(file);
      const docker = dockerSpawn([
        'buildx',
        'build',
        '--progress',
        'plain',
        '--builder',
        builderName,
        '--file',
        file,
        `--${output}`,
        '--platform',
        platforms.map((platform) => `linux/${platform}64`).join(','),
        '--cache-from',
        `type=registry,ref=harbor.riwi.dev/${cacheTag}`,
        '--cache-to',
        `type=registry,ref=harbor.riwi.dev/${cacheTag},mode=max,image-manifest=true`,
        ...tags.flatMap((tag) => ['--tag', tag]),
        ...Object.entries(processEnv).flatMap(([key, value]) => ['--build-arg', `${key}=${value}`]),
        '.',
      ]);
      docker.on('exit', (code) => {
        if (code === 0) {
          console.log(`Image ${tags.join(',')} build and ${output}`);
          return resolve();
        }
        return reject(new Error(`Image ${tags.join(',')} not built`));
      });
    });
  } finally {
    await promiseSpawn('docker', ['buildx', 'rm', builderName]);
  }
}

const archMapping = {
  x64: 'amd',
  arm64: 'arm',
} as const;

export const currentArch = () => {
  const myArch = arch();
  if (myArch !== 'x64' && myArch !== 'arm64') {
    throw new Error('Unsupported platform');
  }
  return archMapping[myArch];
};

const isDockerPlatform = (platform: unknown): platform is DockerPlatform => {
  return Object.values<unknown>(archMapping).includes(platform);
};

export async function dockerRun({
  image,
  file,
  port,
  platform,
}: {
  image: string;
  file: string;
  port: string[] | string;
  platform?: 'arm' | 'amd';
}) {
  if (!platform) {
    platform = currentArch();
  }
  if (!isDockerPlatform(platform)) throw new Error('Unsupported platform');
  await dockerImageRemove(image);
  await dockerBuildxBuild({
    tags: [image],
    file,
    output: 'load',
    platforms: [platform],
  });
  const ports = Array.isArray(port) ? port : [port];
  return new Promise<void>((resolve, reject) => {
    const docker = dockerSpawn([
      'run',
      '--rm',
      '-it',
      '--platform',
      `linux/${platform}64`,
      ...ports.flatMap((port) => ['--publish', port.includes(':') ? port : `${port}:${port}`]),
      `${image}`,
    ]);
    docker.on('exit', (code) => {
      if (code === 0) {
        return resolve();
      }
      return reject(new Error(`Container ${image} run failed`));
    });
  });
}
