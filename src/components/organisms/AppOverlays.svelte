<script lang="ts">
	import QueueDrawer from '$components/organisms/QueueDrawer.svelte';
	import QueuePanel from '$components/organisms/QueuePanel.svelte';
	import ToastStack from '$components/organisms/ToastStack.svelte';
	import { forwardDriveErrorsToToast } from '../../lib/stores/drive-error-toast';
	import { queueStore } from '../../lib/stores/queue.svelte';

	type Props = {
		/** スマートフォン表示かどうか(右下の進行カードの代わりに右からのドロワーで操作キューを見せる) */
		phone?: boolean;
		/** 操作キューのドロワーを開いているかどうか(スマートフォン用) */
		queueOpen?: boolean;
		/** 操作キューのドロワーを閉じる操作 */
		onclosequeue?: () => void;
	};

	let { phone = false, queueOpen = false, onclosequeue }: Props = $props();

	$effect(() => {
		forwardDriveErrorsToToast();
	});
</script>

<!-- 画面の隅に常駐するオーバーレイ。左下にトースト、右下に操作キューの進行カード(スマートフォンでは右からのドロワー)を置く -->
<ToastStack />
{#if phone}
	<QueueDrawer
		open={queueOpen}
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
		onclose={() => {
			onclosequeue?.();
		}}
	/>
{:else}
	<QueuePanel />
{/if}
