import { DockerPlatform } from '../../docker';

export interface BiomejsExecutorSchema {
  fix?: boolean;
  verbose?: boolean;
  changed?: boolean;
  'log-level'?: 'none' | 'debug' | 'info' | 'warn' | 'error';
}
