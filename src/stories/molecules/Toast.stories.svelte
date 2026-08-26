<script module lang="ts">
	import Toast from '$components/molecules/Toast.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/Toast',
		component: Toast,
	});
</script>

<Story
	name="エラー"
	args={{ message: '操作に失敗しました', kind: 'error', durationMs: 5000, ondismiss: () => {} }}
/>

<Story
	name="情報"
	args={{ message: '同期が完了しました', kind: 'info', durationMs: 5000, ondismiss: () => {} }}
/>

<Story
	name="長いメッセージ"
	args={{
		message:
			'切り取った項目は同じアカウント内にのみ移動できます。アカウントを切り替えてからもう一度お試しください',
		kind: 'error',
		durationMs: 5000,
		ondismiss: () => {},
	}}
/>
