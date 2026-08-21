<script module lang="ts">
	import Avatar from '$components/atoms/Avatar.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'atoms/Avatar',
		component: Avatar,
	});
</script>

<Story name="画像あり" args={{ src: '/pwa-192x192.png', alt: 'アリス' }} />

<Story name="頭文字フォールバック" args={{ src: null, alt: 'アリス' }} />

<Story name="大きめ" args={{ src: '/pwa-192x192.png', alt: 'アリス', size: 40 }} />
