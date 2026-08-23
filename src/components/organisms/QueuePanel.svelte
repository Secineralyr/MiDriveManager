<script lang="ts">
	import QueueCard from '$components/organisms/QueueCard.svelte';
	import { queueStore } from '../../lib/stores/queue.svelte';
</script>

<!-- 操作キューの進行カード(表示はQueueCard、状態は操作キューストア) -->
<QueueCard
	tasks={queueStore.tasks}
	onretry={(id) => {
		queueStore.retry(id);
	}}
	ondismiss={(id) => {
		queueStore.dismiss(id);
	}}
	onclearfinished={() => {
		queueStore.clearFinished();
	}}
/>
