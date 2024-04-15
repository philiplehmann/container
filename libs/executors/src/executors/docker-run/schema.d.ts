export interface DockerRunExecutorSchema {
  image: string;
  file: string;
  port: string[] | string;
}
