import type { StartedTestContainer } from 'testcontainers';
import { testContainer, type TestContainerProps } from './test-container';
import { dockerContainerPrune, dockerImagePrune, dockerImageRemove } from '@container/docker';

export interface TestContainerOutput {
  port: number;
}

export const useTestContainer = async ({
  localPort = 3000,
  ...props
}: TestContainerProps & { localPort?: number }): Promise<TestContainerOutput> => {
  const { beforeAll, afterAll } = await import('vitest');
  const output: TestContainerOutput = {} as TestContainerOutput;
  let container: StartedTestContainer;
  let port: number;
  beforeAll(async () => {
    if (process.env.TEST_SERVER_RUNNER === 'local') {
      port = localPort;
    } else {
      [container, port] = await testContainer(props);
    }

    output.port = port;
  });

  afterAll(async () => {
    if (process.env.TEST_SERVER_RUNNER !== 'local') {
      await container?.stop();
      try {
        await dockerImageRemove(props.image);
        await dockerContainerPrune();
        await dockerImagePrune();
      } catch (error) {
        console.warn('Docker cleanup failed:', error);
      }
    }
  });

  return output;
};
