import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Consult https://svelte.dev/docs#compile-time-svelte-preprocess
// for more information about preprocessors
const config = {
	preprocess: vitePreprocess(),
};

export default config;
