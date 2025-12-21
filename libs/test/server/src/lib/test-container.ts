import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import type { Environment } from 'testcontainers/build/types';

export interface TestContainerProps {
  image: string;
  containerPort: number;
  healthPath?: string;
  healthPort?: number;
  healthStatusCode?: number;
  env?: Environment;
  hook?: (container: GenericContainer) => GenericContainer;
}

export const testContainer = async ({
  image,
  containerPort,
  healthPath = '/health/readiness',
  healthPort = containerPort,
  healthStatusCode = 200,
  env,
  hook,
}: TestContainerProps): Promise<[StartedTestContainer, number]> => {
  let genericContainer = new GenericContainer(image)
    .withEnvironment({ ...(env || {}), PORT: String(containerPort) })
    .withExposedPorts(containerPort)
    .withUser('1000:1000')
    .withLogConsumer((stream) => stream.pipe(process.stdout))
    .withWaitStrategy(Wait.forHttp(healthPath, healthPort).forStatusCode(healthStatusCode));

  if (hook) {
    genericContainer = hook(genericContainer);
  }

  const container = await genericContainer.start();
  const port = container.getMappedPort(containerPort);
  return [container, port];
};
