import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { version } from './package.json' with { type: 'json' };

// https://vitejs.dev/config/
export default defineConfig({
	define: {
		APP_VERSION: JSON.stringify(version),
	},
	resolve: {
		alias: {
			$components: new URL('src/components', import.meta.url).pathname,
		},
	},
	plugins: [
		svelte(),
		svelteTesting(),
		basicSsl(),
		// oxlint-disable-next-line new-cap - VitePWAの関数名でエラーになるため
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
			manifest: {
				name: 'MiDriveManager',
				short_name: 'MiDriveManager',
				description: 'Misskeyドライブ整理ツール',
				lang: 'ja',
				display: 'standalone',
				theme_color: '#1f1f1f',
				background_color: '#1f1f1f',
				icons: [
					{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'maskable-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
			workbox: {
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/iu,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'google-fonts-stylesheets',
							expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
						},
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/iu,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-webfonts',
							expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
							cacheableResponse: { statuses: [0, 200] },
						},
					},
				],
			},
		}),
	],
	test: {
		environment: 'jsdom',
	},
});
