import { DockerPlatform } from '../../docker';

export interface DockerTestExecutorSchema {
  platforms: DockerPlatform[];
  tag: string;
  file: string;
}
