import { dockerSpawn } from './docker-helper';

export function dockerImagePrune() {
  return new Promise<void>((resolve) => {
    const docker = dockerSpawn(['image', 'prune', '--force']);
    docker.on('exit', (code) => {
      if (code === 0) {
        console.log('Images pruned successfully');
        return resolve();
      }
      console.log('Images pruned failed');
      return resolve();
    });
  });
}
