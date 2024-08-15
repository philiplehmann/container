import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

export interface TestContainerProps {
  image: string;
  containerPort: number;
  healthPath?: string;
  healthPort?: number;
  healthStatusCode?: number;
  hook?: (container: GenericContainer) => GenericContainer;
}

export const testContainer = async ({
  image,
  containerPort,
  healthPath = '/health/readiness',
  healthPort = containerPort,
  healthStatusCode = 200,
  hook,
}: TestContainerProps): Promise<[StartedTestContainer, number]> => {
  let genericContainer = new GenericContainer(image)
    .withEnvironment({ PORT: String(containerPort) })
    .withExposedPorts(containerPort)
    .withUser('1000:1000')
    .withLogConsumer((stream) => stream.pipe(process.stdout))
    .withWaitStrategy(Wait.forHttp(healthPath, healthPort).forStatusCode(healthStatusCode));

  if (hook) genericContainer = hook(genericContainer);

  const container = await genericContainer.start();
  const port = container.getMappedPort(containerPort);
  return [container, port];
};
