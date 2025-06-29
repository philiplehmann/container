/// <reference types='vitest' />

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/tessaract',

  plugins: [nxViteTsPaths()],

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },

  test: {
    globals: true,
    cacheDir: '../../node_modules/.vitest',
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    testTimeout: 60_000,

    poolOptions: {
      threads: {
        singleThread: true,
        singleFork: true,
      },
    },

    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/tessaract',
      provider: 'v8',
    },
  },
});
