<script module lang="ts">
	import QueueDrawer from '$components/organisms/QueueDrawer.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'organisms/QueueDrawer',
		component: QueueDrawer,
		args: {
			onretry: () => {},
			ondismiss: () => {},
			onclearfinished: () => {},
			onclose: () => {},
		},
	});
</script>

<Story
	name="操作あり"
	args={{
		open: true,
		tasks: [
			{
				id: 1,
				label: '5件のアップロード',
				status: 'running',
				progress: { done: 2, total: 5 },
				error: null,
			},
			{
				id: 2,
				label: '3件の削除',
				status: 'failed',
				progress: { done: 0, total: 3 },
				error: 'ネットワークに接続できません',
			},
		],
	}}
/>

<Story name="操作なし" args={{ open: true, tasks: [] }} />
