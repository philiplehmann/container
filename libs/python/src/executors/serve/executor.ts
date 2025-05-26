import type { Executor } from '@nx/devkit';
import { promiseSpawn } from '@container/docker';
import type { PythonServeExecutorSchema } from './schema';

const runExecutor: Executor<PythonServeExecutorSchema> = async (options) => {
  const args = [];
  if (options.executable) {
    args.push(options.executable);
  } else {
    args.push('python3');
  }
  if (options.module) {
    args.push('-m', options.module);
  }
  args.push(options.entrypoint);
  args.push(...(options.args || []));
  const [executable, ...parameters] = args;
  try {
    await promiseSpawn(executable, parameters, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...(options.port !== undefined ? { UVICORN_PORT: options.port.toString() } : {}),
        ...(process.env.PORT !== undefined ? { UVICORN_PORT: process.env.PORT } : {}),
        ...(process.env.HOST !== undefined ? { UVICORN_HOST: process.env.HOST } : {}),
      },
    });
    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default runExecutor;
