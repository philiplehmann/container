import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { GenericContainer, Network, type StartedNetwork, type StartedTestContainer, Wait } from 'testcontainers';

const execFileAsync = promisify(execFile);

const bucketAccessKeyIdEnv = 'NX_CACHE_BUCKET_ACCESS_KEY_ID';
const bucketSecretAccessKeyEnv = 'NX_CACHE_BUCKET_SECRET_ACCESS_KEY';

export const s3Backends = [
  { id: 'minio', name: 'MinIO' },
  { id: 'garage', name: 'Garage' },
  { id: 'rustfs', name: 'RustFS' },
  { id: 'seaweedfs', name: 'SeaweedFS' },
] as const;

export type S3BackendId = (typeof s3Backends)[number]['id'];

interface StartNxCacheServerTestSetupProps {
  arch: string;
  backendId: S3BackendId;
  bucketName: string;
  bearerToken1: string;
  bearerToken2: string;
}

interface StartedS3Backend {
  container: StartedTestContainer;
  accessKeyId: string;
  secretAccessKey: string;
  endpointUrl: string;
  region?: string;
  stop: () => Promise<void>;
}

export interface NxCacheServerTestSetup {
  cacheServerPort: number;
  stop: () => Promise<void>;
}

export async function startNxCacheServerTestSetup({
  arch,
  backendId,
  bucketName,
  bearerToken1,
  bearerToken2,
}: StartNxCacheServerTestSetupProps): Promise<NxCacheServerTestSetup> {
  const configDir = await mkdtemp(join(tmpdir(), `nx-cache-test-${backendId}-`));
  const configPath = join(configDir, 'config.yaml');
  const network = await new Network().start();

  let storageBackend: StartedS3Backend | undefined;
  let nxCacheContainer: StartedTestContainer | undefined;

  try {
    storageBackend = await startS3Backend({ backendId, bucketName, network });

    const configContent = createConfig({
      bucketName,
      bearerToken1,
      bearerToken2,
      endpointUrl: storageBackend.endpointUrl,
      region: storageBackend.region,
    });

    await writeFile(configPath, configContent, 'utf-8');

    nxCacheContainer = await new GenericContainer(`philiplehmann/nx-cache-server:test-${arch}`)
      .withNetwork(network)
      .withUser('1000:1000')
      .withEnvironment({
        NX_CACHE_SERVER_ACCESS_TOKEN1: bearerToken1,
        NX_CACHE_SERVER_ACCESS_TOKEN2: bearerToken2,
        [bucketAccessKeyIdEnv]: storageBackend.accessKeyId,
        [bucketSecretAccessKeyEnv]: storageBackend.secretAccessKey,
      })
      .withBindMounts([
        {
          source: configPath,
          target: '/config/config.yaml',
          mode: 'ro',
        },
      ])
      .withCommand(['/usr/local/bin/nx-cache-server', '--config', '/config/config.yaml'])
      .withExposedPorts(3000)
      .withWaitStrategy(Wait.forLogMessage(/Server running on port/i))
      .withStartupTimeout(120_000)
      .start();

    return {
      cacheServerPort: nxCacheContainer.getMappedPort(3000),
      stop: async () => {
        await stopAndRemove(nxCacheContainer);
        await storageBackend?.stop();
        await network.stop();
        await rm(configDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await stopAndRemove(nxCacheContainer);
    await storageBackend?.stop();
    await network.stop();
    await rm(configDir, { recursive: true, force: true });
    throw error;
  }
}

async function startS3Backend({
  backendId,
  bucketName,
  network,
}: {
  backendId: S3BackendId;
  bucketName: string;
  network: StartedNetwork;
}): Promise<StartedS3Backend> {
  switch (backendId) {
    case 'minio':
      return startMinioBackend({ bucketName, network });
    case 'garage':
      return startGarageBackend({ bucketName, network });
    case 'rustfs':
      return startRustfsBackend({ bucketName, network });
    case 'seaweedfs':
      return startSeaweedfsBackend({ bucketName, network });
  }
}

async function startMinioBackend({ bucketName, network }: { bucketName: string; network: StartedNetwork }) {
  const alias = 'minio';
  const accessKeyId = 'admin';
  const secretAccessKey = 'password';
  const container = await new GenericContainer('quay.io/minio/minio:latest')
    .withNetwork(network)
    .withNetworkAliases(alias)
    .withCommand(['server', '/data'])
    .withEnvironment({
      MINIO_ROOT_USER: accessKeyId,
      MINIO_ROOT_PASSWORD: secretAccessKey,
    })
    .withExposedPorts(9000)
    .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000).forStatusCode(200))
    .withStartupTimeout(120_000)
    .start();

  await createBucketWithAwsCli({
    container,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpointUrl: 'http://127.0.0.1:9000',
    region: 'us-east-1',
  });

  return {
    container,
    accessKeyId,
    secretAccessKey,
    endpointUrl: `http://${alias}:9000`,
    stop: () => stopAndRemove(container),
  } satisfies StartedS3Backend;
}

async function startRustfsBackend({ bucketName, network }: { bucketName: string; network: StartedNetwork }) {
  const alias = 'rustfs';
  const accessKeyId = 'rustfsadmin';
  const secretAccessKey = 'rustfsadmin';
  const container = await new GenericContainer('rustfs/rustfs:latest')
    .withNetwork(network)
    .withNetworkAliases(alias)
    .withEnvironment({
      RUSTFS_ACCESS_KEY: accessKeyId,
      RUSTFS_SECRET_KEY: secretAccessKey,
    })
    .withExposedPorts(9000)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120_000)
    .start();

  await createBucketWithAwsCli({
    container,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpointUrl: 'http://127.0.0.1:9000',
    region: 'us-east-1',
  });

  return {
    container,
    accessKeyId,
    secretAccessKey,
    endpointUrl: `http://${alias}:9000`,
    stop: () => stopAndRemove(container),
  } satisfies StartedS3Backend;
}

async function startSeaweedfsBackend({ bucketName, network }: { bucketName: string; network: StartedNetwork }) {
  const alias = 'seaweedfs';
  const accessKeyId = 'admin';
  const secretAccessKey = 'key';
  const container = await new GenericContainer('chrislusf/seaweedfs:4.37')
    .withNetwork(network)
    .withNetworkAliases(alias)
    .withCommand(['server', '-s3', '-dir=/data'])
    .withEnvironment({
      AWS_ACCESS_KEY_ID: accessKeyId,
      AWS_SECRET_ACCESS_KEY: secretAccessKey,
    })
    .withExposedPorts(8333)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120_000)
    .start();

  await createBucketWithAwsCli({
    container,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpointUrl: 'http://127.0.0.1:8333',
    region: 'us-east-1',
  });

  return {
    container,
    accessKeyId,
    secretAccessKey,
    endpointUrl: `http://${alias}:8333`,
    stop: () => stopAndRemove(container),
  } satisfies StartedS3Backend;
}

async function startGarageBackend({ bucketName, network }: { bucketName: string; network: StartedNetwork }) {
  const alias = 'garage';
  const configDir = await mkdtemp(join(tmpdir(), 'garage-test-'));
  const configPath = join(configDir, 'garage.toml');
  await writeFile(configPath, garageConfig, 'utf-8');

  const container = await new GenericContainer('dxflrs/garage:v2.4.1')
    .withNetwork(network)
    .withNetworkAliases(alias)
    .withBindMounts([
      {
        source: configPath,
        target: '/etc/garage.toml',
        mode: 'ro',
      },
    ])
    .withCommand(['/garage', '-c', '/etc/garage.toml', 'server'])
    .withExposedPorts(3900)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120_000)
    .start();

  const { accessKeyId, secretAccessKey } = await initializeGarage(container, bucketName);

  return {
    container,
    accessKeyId,
    secretAccessKey,
    endpointUrl: `http://${alias}:3900`,
    region: 'garage',
    stop: async () => {
      await stopAndRemove(container);
      await rm(configDir, { recursive: true, force: true });
    },
  } satisfies StartedS3Backend;
}

async function createBucketWithAwsCli({
  container,
  accessKeyId,
  secretAccessKey,
  bucketName,
  endpointUrl,
  region,
}: {
  container: StartedTestContainer;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpointUrl: string;
  region: string;
}) {
  await retry(async () => {
    await execDocker([
      'run',
      '--rm',
      '--network',
      `container:${container.getId()}`,
      '-e',
      `AWS_ACCESS_KEY_ID=${accessKeyId}`,
      '-e',
      `AWS_SECRET_ACCESS_KEY=${secretAccessKey}`,
      '-e',
      `AWS_DEFAULT_REGION=${region}`,
      'amazon/aws-cli',
      's3api',
      'create-bucket',
      '--bucket',
      bucketName,
      '--endpoint-url',
      endpointUrl,
    ]);
  });
}

async function initializeGarage(container: StartedTestContainer, bucketName: string) {
  const nodeId = await retry(async () => {
    const status = await execDocker(['exec', container.getId(), '/garage', '-c', '/etc/garage.toml', 'status']);
    const nodeLine = status
      .split('\n')
      .map((line) => line.trim())
      .find((line) => /^[0-9a-f]+\s/.test(line));

    if (!nodeLine) {
      throw new Error('Garage node id not available yet');
    }

    return nodeLine.split(/\s+/)[0] ?? '';
  });

  await execDocker(['exec', container.getId(), '/garage', '-c', '/etc/garage.toml', 'layout', 'assign', '-z', 'dc1', '-c', '1G', nodeId]);

  await retry(async () => {
    let lastError: Error | undefined;

    for (const version of ['1', '2', '3', '4', '5']) {
      try {
        await execDocker([
          'exec',
          container.getId(),
          '/garage',
          '-c',
          '/etc/garage.toml',
          'layout',
          'apply',
          '--version',
          version,
        ]);
        return;
      } catch (error) {
        lastError = error as Error;
        if (lastError.message.includes('Invalid new layout version')) {
          continue;
        }
      }
    }

    throw lastError ?? new Error('Garage layout apply failed');
  });

  const keyName = `test-key-${Date.now()}`;
  const keyOutput = await retry(() =>
    execDocker(['exec', container.getId(), '/garage', '-c', '/etc/garage.toml', 'key', 'create', keyName]),
  );

  const accessKeyId = matchOrThrow(keyOutput, /^Key ID:\s+(\S+)$/m, 'Garage access key id');
  const secretAccessKey = matchOrThrow(keyOutput, /^Secret key:\s+(\S+)$/m, 'Garage secret access key');

  await execDocker(['exec', container.getId(), '/garage', '-c', '/etc/garage.toml', 'bucket', 'create', bucketName]);
  await execDocker([
    'exec',
    container.getId(),
    '/garage',
    '-c',
    '/etc/garage.toml',
    'bucket',
    'allow',
    '--read',
    '--write',
    '--owner',
    bucketName,
    '--key',
    keyName,
  ]);

  return { accessKeyId, secretAccessKey };
}

function createConfig({
  bucketName,
  bearerToken1,
  bearerToken2,
  endpointUrl,
  region = 'us-east-1',
}: {
  bucketName: string;
  bearerToken1: string;
  bearerToken2: string;
  endpointUrl: string;
  region?: string;
}) {
  const bucketLines = [
    'buckets:',
    '  - name: test-backend',
    `    bucketName: ${bucketName}`,
    `    region: ${region}`,
    `    endpointUrl: ${endpointUrl}`,
    `    accessKeyIdEnv: ${bucketAccessKeyIdEnv}`,
    `    secretAccessKeyEnv: ${bucketSecretAccessKeyEnv}`,
    '    forcePathStyle: true',
  ];

  return `port: 3000\n\n${bucketLines.join('\n')}\n\nserviceAccessTokens:\n  - name: test-token1\n    bucket: test-backend\n    prefix: /\n    accessTokenEnv: NX_CACHE_SERVER_ACCESS_TOKEN1\n  - name: test-token2\n    bucket: test-backend\n    prefix: /test\n    accessTokenEnv: NX_CACHE_SERVER_ACCESS_TOKEN2\n`;
}

async function execDocker(args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync('docker', args, { maxBuffer: 10 * 1024 * 1024 });
    return [stdout, stderr].filter(Boolean).join('\n').trim();
  } catch (error) {
    const details = error as Error & { stdout?: string; stderr?: string };
    const output = [details.stdout, details.stderr].filter(Boolean).join('\n').trim();
    throw new Error(output || details.message);
  }
}

async function retry<T>(callback: () => Promise<T>, retries = 20, delayMs = 1_000): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      if (attempt === retries - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

function matchOrThrow(output: string, pattern: RegExp, label: string) {
  const match = output.match(pattern)?.[1];
  if (!match) {
    throw new Error(`Unable to parse ${label} from Garage output:\n${output}`);
  }
  return match;
}

async function stopAndRemove(container: StartedTestContainer | undefined) {
  await container?.stop();
}

const garageConfig = `metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"

replication_factor = 1

rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"

[s3_web]
bind_addr = "[::]:3902"
root_domain = ".web.garage.localhost"
index = "index.html"

[admin]
api_bind_addr = "[::]:3903"
admin_token = "test-admin-token"
metrics_token = "test-metrics-token"
`;
