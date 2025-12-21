export interface BunBuildExecutorSchema {
  entrypoints: string[];
  outdir: string;
  target: 'bun' | 'node' | 'browser';
  format: 'esm' | 'cjs' | 'iife';
  packages: 'bundle' | 'external';
  tsConfig?: string;
}
