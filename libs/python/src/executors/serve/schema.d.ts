export interface PythonServeExecutorSchema {
  entrypoint: string;
  cwd: string;
  args?: string[];
  module?: string;
  executable?: string;
  port?: number;
}
