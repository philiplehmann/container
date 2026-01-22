import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const possibleTsConfigs = [
  'tsconfig.spec.json',
  'tsconfig.base.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.lib.json',
];

export const getTsConfigPath = (tsconfig: string, root: string) => {
  if (!existsSync(resolve(root, tsconfig))) {
    for (const config in possibleTsConfigs) {
      if (existsSync(resolve(root, config))) {
        return config;
      }
    }
    throw new Error(`Could not find a valid tsconfig file in ${root}`);
  }
  return tsconfig;
};
