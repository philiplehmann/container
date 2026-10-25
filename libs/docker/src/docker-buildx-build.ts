import { promiseSpawn } from '@riwi/nx';
import { type DockerPlatform, dockerSpawn, envForDockerFile } from './docker-helper';

export async function dockerBuildxBuild({
  platforms,
  output,
  file,
  tags,
  sbom = false,
  provenance = false,
  labels = {},
  metadataFile,
}: {
  platforms: DockerPlatform[];
  output: 'load' | 'push';
  file: string;
  tags: string[];
  sbom?: boolean;
  provenance?: boolean;
  labels?: Record<string, string>;
  metadataFile?: string;
}) {
  const builderName = `builder-${tags[0]?.split(':')?.[0]?.replaceAll('/', '-') ?? file.replaceAll('/', '-')}-${platforms.join('-')}`;
  try {
    try {
      await promiseSpawn('docker', [
        'buildx',
        'create',
        '--name',
        builderName,
        '--platform',
        'linux/amd64,linux/arm64',
      ]);
    } catch (error) {
      console.error('Failed to create builder:', error);
    }
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
        ...Object.entries(labels).flatMap(([key, value]) => ['--label', `${key}=${value}`]),
        // multi-platform pushes need the metadata on the index too, labels only end up in the image configs
        ...(output === 'push'
          ? Object.entries(labels).flatMap(([key, value]) => ['--annotation', `index,manifest:${key}=${value}`])
          : []),
        ...(sbom && output === 'push' ? ['--sbom=true'] : []),
        ...(provenance && output === 'push' ? ['--provenance=mode=max'] : []),
        ...(metadataFile ? ['--metadata-file', metadataFile] : []),
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
  }
}
