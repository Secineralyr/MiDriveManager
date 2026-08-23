<script module lang="ts">
	import Button from '$components/atoms/Button.svelte';
	import ToastStack from '$components/organisms/ToastStack.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { toastStore } from '../../lib/stores/toast.svelte';

	const { Story } = defineMeta({
		title: 'organisms/ToastStack',
		component: ToastStack,
	});
</script>

<Story name="操作デモ">
	{#snippet template()}
		<div style="display: flex; gap: 10px;">
			<Button
				variant="tonal"
				onclick={() => {
					toastStore.show({ message: '操作に失敗しました' });
				}}
			>
				エラーを表示
			</Button>
			<Button
				variant="tonal"
				onclick={() => {
					toastStore.show({ message: '同期が完了しました', kind: 'info' });
				}}
			>
				情報を表示
			</Button>
		</div>
		<ToastStack />
	{/snippet}
</Story>
