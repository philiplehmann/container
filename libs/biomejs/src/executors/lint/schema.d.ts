import { DockerPlatform } from '../../docker-helper';

export interface BiomejsExecutorSchema {
  fix?: boolean;
  verbose?: boolean;
  changed?: boolean;
  'log-level'?: 'none' | 'debug' | 'info' | 'warn' | 'error';
}
