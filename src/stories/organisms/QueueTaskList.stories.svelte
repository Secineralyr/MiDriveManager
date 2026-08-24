<script module lang="ts">
	import QueueTaskList from '$components/organisms/QueueTaskList.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'organisms/QueueTaskList',
		component: QueueTaskList,
		args: {
			onretry: () => {},
			ondismiss: () => {},
		},
	});
</script>

<Story
	name="各状態"
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
			{ id: 3, label: '2件の移動', status: 'done', progress: { done: 2, total: 2 }, error: null },
			{
				id: 4,
				label: '1件のダウンロード',
				status: 'failed',
				progress: { done: 0, total: 1 },
				error: 'ネットワークに接続できません',
			},
		],
	}}
/>
