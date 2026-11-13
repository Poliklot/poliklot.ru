// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import expressiveCode from 'astro-expressive-code';

// https://astro.build/config
export default defineConfig({
	site: 'https://poliklot.ru',
	output: 'static',
	integrations: [expressiveCode(), react()],
	vite: {
		// Keep named scroll timelines out of animation shorthands unsupported by Chrome.
		build: { cssMinify: 'esbuild' },
		resolve: { noExternal: [/^@gravity-ui\//] },
	},
});
