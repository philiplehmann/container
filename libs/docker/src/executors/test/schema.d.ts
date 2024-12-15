import type { DockerPlatform } from '../../docker-helper';

export interface DockerTestExecutorSchema {
  tag: string;
  file: string;
}
