import { type SpawnOptions, spawn } from 'node:child_process';

export function promiseSpawn(command: string, args: string[], options?: Omit<SpawnOptions, 'stdio'>) {
  return new Promise<string>((resolve, reject) => {
    console.info('spawn:', command, ...args);
    const docker = spawn(command, args, { ...options, stdio: 'inherit' });
    let output = '';
    docker.on('data', (data) => {
      output += data.toString();
    });
    docker.on('exit', (code) => {
      if (code === 0) {
        return resolve(output);
      }
      return reject(new Error(`Command ${command} ${args.join(' ')} failed`));
    });
  });
}
