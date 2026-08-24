<script lang="ts">
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconTrash from '@tabler/icons-svelte/icons/trash';
	import IconX from '@tabler/icons-svelte/icons/x';
	import type { QueueListTask } from '$components/organisms/QueueTaskList.svelte';
	import QueueTaskList from '$components/organisms/QueueTaskList.svelte';
	import { fade } from 'svelte/transition';
	import { sheetRight } from '../../lib/utils/transitions';

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** 表示するタスクの一覧(積んだ順) */
		tasks: QueueListTask[];
		/** 失敗したタスクの再試行 */
		onretry: (id: number) => void;
		/** 完了・失敗したタスクを1件消す操作 */
		ondismiss: (id: number) => void;
		/** 完了・失敗したタスクをまとめて消す操作 */
		onclearfinished: () => void;
		/** ドロワーを閉じる操作(スクリム、閉じるボタン、Escで呼ばれる) */
		onclose: () => void;
	};

	let { open, tasks, onretry, ondismiss, onclearfinished, onclose }: Props = $props();

	const finishedCount = $derived(
		tasks.filter((task) => task.status === 'done' || task.status === 'failed').length,
	);

	/**
	 * Escキーでドロワーを閉じる
	 * @param event - キーボードイベント
	 */
	const handleKeydown = (event: KeyboardEvent) => {
		if (open && event.key === 'Escape') {
			onclose();
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -- ドロワーの背景。閉じる操作はボタンとEscキーでも行える -->
	<div class="scrim" transition:fade={{ duration: 250 }} onclick={onclose}></div>
	<div class="drawer" role="dialog" aria-modal="true" aria-label="操作キュー" transition:sheetRight>
		<header>
			<h2>操作キュー</h2>
			<div>
				<IconButton label="完了した操作を消す" disabled={finishedCount === 0} onclick={onclearfinished}>
					<IconTrash size={18} />
				</IconButton>
				<IconButton label="閉じる" onclick={onclose}>
					<IconX size={18} />
				</IconButton>
			</div>
		</header>
		{#if tasks.length === 0}
			<p>操作はありません</p>
		{:else}
			<QueueTaskList {tasks} {onretry} {ondismiss} />
		{/if}
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 200;
		background-color: var(--color-scrim);
	}

	.drawer {
		display: flex;
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 201;
		flex-direction: column;
		overflow-y: auto;
		border-left: 1px solid var(--color-outline);
		padding-top: env(safe-area-inset-top);
		padding-bottom: env(safe-area-inset-bottom);
		background-color: var(--color-bg);
		inline-size: min(360px, 85vw);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 15px;
		gap: 10px;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	header > div {
		display: flex;
		gap: 5px;
	}

	p {
		margin: 20px 15px;
		text-align: center;
		color: var(--color-text-faint);
	}
</style>
