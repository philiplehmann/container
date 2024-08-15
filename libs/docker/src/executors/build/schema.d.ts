import type { DockerPlatform } from '../../docker-helper';

export interface DockerBuildExecutorSchema {
  platforms: DockerPlatform[];
  tags: string[];
  file: string;
}
