import { promiseSpawn } from '@container/docker';
import type { PromiseExecutor } from '@nx/devkit';
import type { PythonServeExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<PythonServeExecutorSchema> = async ({
  module,
  executable: optionExecutable,
  args: optionArgs,
  entrypoint,
  cwd,
  env,
  port,
}) => {
  const args: [string, ...string[]] = [optionExecutable || 'python3'];
  if (module) {
    args.push('-m', module);
  }
  args.push(entrypoint);
  args.push(...(optionArgs || []));
  const [executable, ...parameters] = args;
  try {
    await promiseSpawn(executable, parameters, {
      cwd: cwd,
      env: {
        ...env,
        ...process.env,
        ...(port !== undefined ? { UVICORN_PORT: port.toString() } : {}),
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
