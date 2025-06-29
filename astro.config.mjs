import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

const DEV_PORT = 2121;

// Configuración del sitio
const getSiteUrl = () => {
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}
	if (process.env.CI) {
		return 'https://themesberg.github.io';
	}
	return `http://localhost:${DEV_PORT}`;
};

const getBase = () => {
	if (process.env.VERCEL_URL) {
		return undefined;
	}
	if (process.env.CI) {
		return '/flowbite-astro-admin-dashboard';
	}
	return undefined;
};

// https://astro.build/config
export default defineConfig({
	site: getSiteUrl(),
	base: getBase(),

	// output: 'server',

	/* Like Vercel, Netlify,… Mimicking for dev. server */
	// trailingSlash: 'always',

	server: {
		/* Dev. server only */
		port: DEV_PORT,
	},

	vite: {
		optimizeDeps: {
			exclude: ['shiki']
		},
		build: {
			rollupOptions: {
				external: ['shiki/themes/hc_light.json', 'shiki/themes/hc_black.json']
			}
		}
	},

	integrations: [
		//
		sitemap(),
		tailwind(),
	],
});
