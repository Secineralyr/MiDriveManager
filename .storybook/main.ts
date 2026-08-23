import type { StorybookConfig } from '@storybook/svelte-vite';

const config: StorybookConfig = {
	stories: ['../src/stories/**/*.stories.svelte'],
	addons: ['@storybook/addon-svelte-csf'],
	framework: {
		name: '@storybook/svelte-vite',
		options: {},
	},
	staticDirs: ['../public'],
};

// oxlint-disable-next-line import/no-default-export - Storybookの規約で設定はdefault exportが必要
export default config;
