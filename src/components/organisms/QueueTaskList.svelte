<script module lang="ts">
	/** 一覧に表示するタスク */
	export type QueueListTask = {
		/** タスクの識別子 */
		id: number;
		/** 表示名 */
		label: string;
		/** タスクの状態 */
		status: 'pending' | 'running' | 'done' | 'failed';
		/** 進捗(完了件数と全件数) */
		progress: {
			/** 完了した件数 */
			done: number;
			/** 全体の件数(不明なら0) */
			total: number;
		};
		/** 失敗時のエラーメッセージ(それ以外はnull) */
		error: string | null;
	};
</script>

<script lang="ts">
	import IconAlertCircle from '@tabler/icons-svelte/icons/alert-circle';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconRefresh from '@tabler/icons-svelte/icons/refresh';
	import IconX from '@tabler/icons-svelte/icons/x';
	import Spinner from '$components/atoms/Spinner.svelte';

	type Props = {
		/** 表示するタスクの一覧(積んだ順) */
		tasks: QueueListTask[];
		/** 失敗したタスクの再試行 */
		onretry: (id: number) => void;
		/** 完了・失敗したタスクを1件消す操作 */
		ondismiss: (id: number) => void;
	};

	let { tasks, onretry, ondismiss }: Props = $props();

	/**
	 * タスクの状態を表す文言を返す
	 * @param task - 対象のタスク
	 * @returns 状態の文言
	 */
	const statusText = (task: QueueListTask) => {
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
	const progressRatio = (task: QueueListTask) => {
		if (task.status === 'done') {
			return 1;
		}

		return task.progress.total > 0 ? task.progress.done / task.progress.total : 0;
	};
</script>

<ul>
	{#each tasks as task (task.id)}
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
						onretry(task.id);
					}}
				>
					<IconRefresh size={16} />
				</IconButton>
			{/if}
			{#if task.status === 'done' || task.status === 'failed'}
				<IconButton
					label="この操作を消す"
					onclick={() => {
						ondismiss(task.id);
					}}
				>
					<IconX size={16} />
				</IconButton>
			{/if}
		</li>
	{/each}
</ul>

<style>
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
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
