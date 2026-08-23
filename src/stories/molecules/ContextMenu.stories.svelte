<script module lang="ts">
	import ContextMenu from '$components/molecules/ContextMenu.svelte';
	import { buildSelectionMenu } from '../../lib/services/context-menu';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/ContextMenu',
		component: ContextMenu,
	});
</script>

<Story
	name="ファイル1件"
	args={{
		open: true,
		x: 40,
		y: 40,
		items: buildSelectionMenu([{ kind: 'file', id: 'f1' }]),
		onselect: () => {},
		onclose: () => {},
	}}
/>

<Story
	name="フォルダを含む複数選択"
	args={{
		open: true,
		x: 40,
		y: 40,
		items: buildSelectionMenu([
			{ kind: 'folder', id: 'd1' },
			{ kind: 'file', id: 'f1' },
		]),
		onselect: () => {},
		onclose: () => {},
	}}
/>
