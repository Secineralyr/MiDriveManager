<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import IconAlertCircle from '@tabler/icons-svelte/icons/alert-circle';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconRefresh from '@tabler/icons-svelte/icons/refresh';
	import IconX from '@tabler/icons-svelte/icons/x';
	import type { QueueTask } from '../../lib/stores/queue.svelte';
	import Spinner from '$components/atoms/Spinner.svelte';
	import { queueStore } from '../../lib/stores/queue.svelte';

	let collapsed = $state(false);

	const failedCount = $derived(
		queueStore.tasks.filter((task) => task.status === 'failed').length,
	);

	const finishedCount = $derived(queueStore.tasks.length - queueStore.activeCount);

	const title = $derived.by(() => {
		if (queueStore.activeCount > 0) {
			return `${queueStore.activeCount}件の操作を実行中`;
		}

		if (failedCount > 0) {
			return `${failedCount}件の操作が失敗しました`;
		}

		return 'すべての操作が完了しました';
	});

	/**
	 * タスクの状態を表す文言を返す
	 * @param task - 対象のタスク
	 * @returns 状態の文言
	 */
	const statusText = (task: QueueTask) => {
		if (task.status === 'pending') {
			return '待機中';
		}

		if (task.status === 'running') {
			return task.progress.total > 0
				? `${task.progress.done} / ${task.progress.total}`
				: '実行中';
		}

		if (task.status === 'failed') {
			return task.error ?? '失敗しました';
		}

		return '完了';
	};

	/**
	 * タスクの進捗率(0〜1)を返す
	 * @param task - 対象のタスク
	 * @returns 進捗率
	 */
	const progressRatio = (task: QueueTask) => {
		if (task.status === 'done') {
			return 1;
		}

		return task.progress.total > 0 ? task.progress.done / task.progress.total : 0;
	};
</script>

{#if queueStore.tasks.length > 0}
	<section aria-label="操作キュー" transition:fly|global={{ y: 15, duration: 250 }}>
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
					onclick={() => {
						queueStore.clearFinished();
					}}
				>
					<IconX size={16} />
				</IconButton>
			</div>
		</header>
		{#if !collapsed}
			<ul transition:slide={{ duration: 250 }}>
				{#each queueStore.tasks as task (task.id)}
					<li data-status={task.status}>
						<span>
							{#if task.status === 'running'}
								<Spinner size={16} />
							{:else if task.status === 'done'}
								<IconCheck size={16} />
							{:else if task.status === 'failed'}
								<IconAlertCircle size={16} />
							{:else}
								<IconClock size={16} />
							{/if}
						</span>
						<div>
							<p>{task.label}</p>
							<p>{statusText(task)}</p>
							<span style:transform="scaleX({progressRatio(task)})"></span>
						</div>
						{#if task.status === 'failed'}
							<IconButton
								label="再試行"
								onclick={() => {
									queueStore.retry(task.id);
								}}
							>
								<IconRefresh size={16} />
							</IconButton>
						{/if}
						{#if task.status === 'done' || task.status === 'failed'}
							<IconButton
								label="この操作を消す"
								onclick={() => {
									queueStore.dismiss(task.id);
								}}
							>
								<IconX size={16} />
							</IconButton>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	section {
		position: fixed;
		right: 20px;
		bottom: 20px;
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

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		max-height: 240px;
		overflow-y: auto;
	}

	li {
		display: flex;
		align-items: center;
		padding: 10px 15px;
		border-top: 1px solid var(--color-outline-weak);
		gap: 10px;
	}

	li > span {
		display: inline-flex;
		color: var(--color-text-muted);
	}

	li[data-status='failed'] > span {
		color: var(--color-danger);
	}

	li > div {
		display: flex;
		position: relative;
		flex: 1;
		flex-direction: column;
		padding-bottom: 6px;
		gap: 4px;
		min-width: 0;
	}

	li > div > p {
		margin: 0;
		font-size: 0.85rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
	}

	li > div > p:last-of-type {
		font-size: 0.75rem;
		overflow-wrap: anywhere;
		white-space: normal;
		color: var(--color-text-muted);
	}

	li[data-status='failed'] > div > p:last-of-type {
		color: var(--color-danger);
	}

	li > div > span {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		min-height: 2px;
		background-color: var(--color-text-faint);
		transform-origin: left;
		transition: transform 250ms ease;
	}

	li[data-status='done'] > div > span {
		background-color: var(--color-text-muted);
	}
</style>
