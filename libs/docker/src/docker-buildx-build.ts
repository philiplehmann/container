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
