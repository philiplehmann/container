import { afterAll, beforeAll } from 'bun:test';
import { type TestContainerProps, testContainer } from '@container/test/server';
import type { StartedTestContainer } from 'testcontainers';

export interface TestContainerOutput {
  port: number;
}

export const useTestContainer = ({
  localPort = 3000,
  timeout = 30_000,
  ...props
}: TestContainerProps & { localPort?: number; timeout?: number }): TestContainerOutput => {
  const output: TestContainerOutput = {} as TestContainerOutput;
  let container: StartedTestContainer | undefined;

  beforeAll(
    async () => {
      if (process.env.TEST_SERVER_RUNNER === 'local') {
        output.port = localPort;
        return;
      }

      const [startedContainer, mappedPort] = await testContainer(props);
      container = startedContainer;
      output.port = mappedPort;
    },
    { timeout },
  );

  afterAll(async () => {
    if (process.env.TEST_SERVER_RUNNER !== 'local') {
      await container?.stop();
    }
  });

  return output;
};
