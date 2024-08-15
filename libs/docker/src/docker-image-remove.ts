import { dockerSpawn } from './docker-helper';

export function dockerImageRemove(image: string) {
  return new Promise<void>((resolve) => {
    const docker = dockerSpawn(['image', 'rm', image]);
    docker.on('exit', (code) => {
      if (code === 0) {
        console.log(`Image ${image} removed`);
        return resolve();
      }
      console.log(`Image ${image} not found or could not be removed`);
      return resolve();
    });
  });
}
