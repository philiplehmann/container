import type { DockerPlatform } from '../../docker-helper';

export interface DockerBuildExecutorSchema {
  platforms: DockerPlatform[];
  tags: string[];
  file: string;
  versionSource?: 'env' | 'packageJson' | 'custom';
  versionSourceEnv?: string;
  versionSourcePackage?: string;
  versionFormat?: string;
}
