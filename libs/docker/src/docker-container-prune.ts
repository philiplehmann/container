import { dockerSpawn } from './docker-helper';

export function dockerContainerPrune() {
  return new Promise<void>((resolve) => {
    const docker = dockerSpawn(['container', 'prune', '--force']);
    docker.on('exit', (code) => {
      if (code === 0) {
        console.log('containers pruned successfully');
        return resolve();
      }
      console.log('containers pruned failed');
      return resolve();
    });
  });
}
