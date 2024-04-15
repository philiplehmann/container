/// <reference types='vitest' />
import { defineConfig } from "vite";

import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
	root: __dirname,
	cacheDir: "../../node_modules/.vite/libs/executors",

	plugins: [nxViteTsPaths()],

	// Uncomment this if you are using workers.
	// worker: {
	//  plugins: [ nxViteTsPaths() ],
	// },

	test: {
		globals: true,
		cache: {
			dir: "../../node_modules/.vitest",
		},
		environment: "jsdom",
		include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		testTimeout: 60_000,

		reporters: ["default"],
		coverage: {
			reportsDirectory: "../../coverage/libs/executors",
			provider: "v8",
		},
	},
});
