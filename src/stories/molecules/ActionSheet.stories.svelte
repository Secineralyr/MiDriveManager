<script module lang="ts">
	import ActionSheet from '$components/molecules/ActionSheet.svelte';
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconTrash from '@tabler/icons-svelte/icons/trash';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/ActionSheet',
		component: ActionSheet,
	});
</script>

<Story
	name="項目の操作"
	args={{
		open: true,
		title: 'がぞー.jpg',
		items: [
			{ id: 'download', label: 'ダウンロード', icon: IconDownload },
			{ id: 'rename', label: '名前の変更', disabled: true },
			{ id: 'delete', label: '削除', danger: true, icon: IconTrash },
		],
		onselect: () => {},
		onclose: () => {},
	}}
/>

<Story
	name="並び替え(チェック付き)"
	args={{
		open: true,
		title: '並び替え',
		items: [
			{ id: 'name', label: '名前(昇順)', checked: true },
			{ id: 'createdAt', label: '追加日' },
			{ id: 'size', label: 'ファイルサイズ' },
		],
		onselect: () => {},
		onclose: () => {},
	}}
/>
