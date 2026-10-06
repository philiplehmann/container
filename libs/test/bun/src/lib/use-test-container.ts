import { afterAll, afterEach, beforeAll, beforeEach } from 'bun:test';
import { type TestContainerProps, testContainer } from '@riwi/test/server';
import type { StartedTestContainer } from 'testcontainers';

export interface TestContainerOutput {
  port: number;
}

export const useTestContainer = ({
  localPort = 3000,
  timeout = 30_000,
  type = 'all',
  ...props
}: TestContainerProps & { localPort?: number; timeout?: number; type?: 'each' | 'all' }): TestContainerOutput => {
  const output: TestContainerOutput = {} as TestContainerOutput;
  let container: StartedTestContainer | undefined;

  const before = async () => {
    if (process.env.TEST_SERVER_RUNNER === 'local') {
      output.port = localPort;
      return;
    }

    const [startedContainer, mappedPort] = await testContainer(props);
    container = startedContainer;
    output.port = mappedPort;
  };

  const after = async () => {
    if (process.env.TEST_SERVER_RUNNER !== 'local') {
      await container?.stop();
    }
  };

  if (type === 'all') {
    beforeAll(before, { timeout });
    afterAll(after);
  } else if (type === 'each') {
    beforeEach(before, { timeout });
    afterEach(after);
  } else {
    throw new Error(`Invalid type: ${type}`);
  }

  return output;
};
