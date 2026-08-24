<script module lang="ts">
	import type { QueueListTask } from '$components/organisms/QueueTaskList.svelte';

	/** 進行カードに表示するタスク */
	export type QueueCardTask = QueueListTask;
</script>

<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import IconX from '@tabler/icons-svelte/icons/x';
	import QueueTaskList from '$components/organisms/QueueTaskList.svelte';

	type Props = {
		/** 表示するタスクの一覧(積んだ順) */
		tasks: QueueCardTask[];
		/** 失敗したタスクの再試行 */
		onretry: (id: number) => void;
		/** 完了・失敗したタスクを1件消す操作 */
		ondismiss: (id: number) => void;
		/** 完了・失敗したタスクをまとめて消す操作 */
		onclearfinished: () => void;
	};

	let { tasks, onretry, ondismiss, onclearfinished }: Props = $props();

	let collapsed = $state(false);

	const activeCount = $derived(
		tasks.filter((task) => task.status === 'pending' || task.status === 'running').length,
	);

	const failedCount = $derived(tasks.filter((task) => task.status === 'failed').length);

	const finishedCount = $derived(tasks.length - activeCount);

	const title = $derived.by(() => {
		if (activeCount > 0) {
			return `${activeCount}件の操作を実行中`;
		}

		if (failedCount > 0) {
			return `${failedCount}件の操作が失敗しました`;
		}

		return 'すべての操作が完了しました';
	});

</script>

{#if tasks.length > 0}
	<section aria-label="操作キュー" data-tour="queue" transition:fly|global={{ y: 15, duration: 250 }}>
		<header>
			<h2>{title}</h2>
			<div>
				<IconButton
					label={collapsed ? '一覧を開く' : '一覧を閉じる'}
					onclick={() => {
						collapsed = !collapsed;
					}}
				>
					<span data-collapsed={collapsed}>
						<IconChevronDown size={16} />
					</span>
				</IconButton>
				<IconButton
					label="完了した操作を消す"
					disabled={finishedCount === 0}
					onclick={onclearfinished}
				>
					<IconX size={16} />
				</IconButton>
			</div>
		</header>
		{#if !collapsed}
			<div transition:slide={{ duration: 250 }}>
				<QueueTaskList {tasks} {onretry} {ondismiss} />
			</div>
		{/if}
	</section>
{/if}

<style>
	section {
		position: fixed;
		right: 20px;
		bottom: calc(20px + env(safe-area-inset-bottom));
		z-index: 1000;
		overflow: hidden;
		border: 1px solid var(--color-outline);
		border-radius: 5px;
		background-color: var(--color-surface);
		/* 内容(失敗メッセージの長さや折りたたみ)で幅が変わらないよう固定幅にする */
		min-width: 360px;
		max-width: 360px;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 15px;
		gap: 10px;
		background-color: var(--color-surface-active);
	}

	header > h2 {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
	}

	header > div {
		display: flex;
		gap: 5px;
	}

	header span {
		display: inline-flex;
		transition: rotate 250ms ease;
	}

	header span[data-collapsed='true'] {
		rotate: 180deg;
	}

	/* 一覧は高さを抑えてスクロールさせる */
	section > div {
		max-height: 240px;
		overflow-y: auto;
	}
</style>
