import { type SpawnOptions, spawn } from 'node:child_process';

export function promiseSpawn(command: string, args: string[], options?: Omit<SpawnOptions, 'stdio'>) {
  return new Promise<void>((resolve, reject) => {
    console.info('spawn:', command, ...args);
    const docker = spawn(command, args, { ...options, stdio: 'inherit' });
    docker.on('exit', (code) => {
      if (code === 0) {
        return resolve();
      }
      return reject(new Error(`Command ${command} ${args.join(' ')} failed`));
    });
  });
}
