export interface DockerTestExecutorSchema {
  platforms: DockerPlatform[];
  tag: string;
  file: string;
}
