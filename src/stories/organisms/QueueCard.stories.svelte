<script module lang="ts">
	import QueueCard from '$components/organisms/QueueCard.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'organisms/QueueCard',
		component: QueueCard,
		args: {
			onretry: () => {},
			ondismiss: () => {},
			onclearfinished: () => {},
		},
	});
</script>

<Story
	name="実行中と待機中"
	args={{
		tasks: [
			{
				id: 1,
				label: '5件のアップロード',
				status: 'running',
				progress: { done: 2, total: 5 },
				error: null,
			},
			{ id: 2, label: '3件の削除', status: 'pending', progress: { done: 0, total: 0 }, error: null },
		],
	}}
/>

<Story
	name="完了と失敗"
	args={{
		tasks: [
			{ id: 1, label: '2件の移動', status: 'done', progress: { done: 2, total: 2 }, error: null },
			{
				id: 2,
				label: '3件の削除',
				status: 'failed',
				progress: { done: 1, total: 3 },
				error: 'フォルダが空ではないため削除できません',
			},
		],
	}}
/>
