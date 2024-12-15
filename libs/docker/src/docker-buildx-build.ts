import { randomBytes } from 'node:crypto';
import { dockerSpawn, envForDockerFile, type DockerPlatform } from './docker-helper';
import { promiseSpawn } from './promise-spawn';

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
        platforms.map((platform) => `linux/${platform}`).join(','),
        '--cache-from',
        'type=gha',
        '--cache-to',
        'type=gha,mode=max',
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
