import type { DockerPlatform } from '../../docker-helper';

export interface DockerTestExecutorSchema {
  platforms: DockerPlatform[];
  tag: string;
  file: string;
}
