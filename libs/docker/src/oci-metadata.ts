import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OCI_PREFIX = 'org.opencontainers.image';

const licenseFromPackageJson = (root: string) => {
  const packageJsonPath = join(root, 'package.json');
  if (!existsSync(packageJsonPath)) return undefined;
  const { license } = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { license?: unknown };
  return typeof license === 'string' ? license : undefined;
};

export const ociLabels = ({
  title,
  version,
  root,
  labels = {},
  env = process.env,
  now = new Date(),
}: {
  title?: string;
  version?: string;
  root: string;
  labels?: Record<string, string>;
  env?: Partial<Record<string, string>>;
  now?: Date;
}): Record<string, string> => {
  const source =
    env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}` : undefined;

  const defaults: Partial<Record<string, string>> = {
    [`${OCI_PREFIX}.title`]: title,
    [`${OCI_PREFIX}.version`]: version,
    [`${OCI_PREFIX}.created`]: now.toISOString(),
    [`${OCI_PREFIX}.source`]: source,
    [`${OCI_PREFIX}.url`]: source,
    [`${OCI_PREFIX}.revision`]: env.GITHUB_SHA,
    [`${OCI_PREFIX}.licenses`]: licenseFromPackageJson(root),
  };

  return Object.fromEntries(
    Object.entries({ ...defaults, ...labels }).filter((entry): entry is [string, string] => !!entry[1]),
  );
};
