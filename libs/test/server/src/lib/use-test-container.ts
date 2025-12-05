import { after, before } from 'node:test';
import type { StartedTestContainer } from 'testcontainers';
import { type TestContainerProps, testContainer } from './test-container';

export interface TestContainerOutput {
  port: number;
}

export const useTestContainer = ({
  localPort = 3000,
  ...props
}: TestContainerProps & { localPort?: number }): TestContainerOutput => {
  const output: TestContainerOutput = {} as TestContainerOutput;
  let container: StartedTestContainer | undefined;

  before(async () => {
    if (process.env.TEST_SERVER_RUNNER === 'local') {
      output.port = localPort;
      return;
    }

    const [startedContainer, mappedPort] = await testContainer(props);
    container = startedContainer;
    output.port = mappedPort;
  });

  after(async () => {
    if (process.env.TEST_SERVER_RUNNER !== 'local') {
      await container?.stop();
    }
  });

  return output;
};
