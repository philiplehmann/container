import { dockerBuildxBuild } from './docker-buildx-build';
import { currentArch, dockerSpawn, isDockerPlatform } from './docker-helper';
import { dockerImageRemove } from './docker-image-remove';

export async function dockerRun({
  image,
  file,
  port,
  platform,
}: {
  image: string;
  file: string;
  port: string[] | string;
  platform?: 'arm64' | 'amd64';
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
      '--user',
      '1000:1000',
      '--platform',
      `linux/${platform}`,
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
