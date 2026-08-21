<script module lang="ts">
	import ConfirmDialog from '$components/molecules/ConfirmDialog.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/ConfirmDialog',
		component: ConfirmDialog,
	});
</script>

<Story
	name="標準"
	args={{
		open: true,
		title: '確認',
		message: 'この操作を実行しますか?',
		onconfirm: () => {},
		oncancel: () => {},
	}}
/>

<Story
	name="破壊的操作"
	args={{
		open: true,
		danger: true,
		title: 'アカウントの削除',
		message:
			'アリス(@alice@misskey.example)をこのアプリから削除します。サーバー上のデータは削除されません。',
		confirmLabel: '削除',
		onconfirm: () => {},
		oncancel: () => {},
	}}
/>
