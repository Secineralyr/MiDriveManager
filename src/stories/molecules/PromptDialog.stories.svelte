<script module lang="ts">
	import PromptDialog from '$components/molecules/PromptDialog.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/PromptDialog',
		component: PromptDialog,
	});
</script>

<Story
	name="フォルダ作成"
	args={{
		open: true,
		title: '新しいフォルダ',
		label: 'フォルダ名',
		confirmLabel: '作成',
		onconfirm: () => {},
		oncancel: () => {},
	}}
/>

<Story
	name="名前の変更"
	args={{
		open: true,
		title: '名前の変更',
		label: '新しい名前',
		initialValue: 'がぞー.jpg',
		confirmLabel: '変更',
		onconfirm: () => {},
		oncancel: () => {},
	}}
/>
