<script module lang="ts">
	import AppMenu from '$components/organisms/AppMenu.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'organisms/AppMenu',
		component: AppMenu,
	});
</script>

<Story
	name="デスクトップ(ポップアップ)"
	args={{
		position: { x: 20, y: 20 },
		onclose: () => {},
		onshowtutorial: () => {},
		onresync: () => {},
	}}
/>

<Story
	name="スマートフォン(シート)"
	args={{
		position: { x: 0, y: 0 },
		phone: true,
		onclose: () => {},
		onshowtutorial: () => {},
		onresync: () => {},
	}}
/>
