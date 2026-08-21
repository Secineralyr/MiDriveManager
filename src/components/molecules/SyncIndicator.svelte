<script lang="ts">
	import Button from '$components/atoms/Button.svelte';
	import IconAlertCircle from '@tabler/icons-svelte/icons/alert-circle';
	import Spinner from '$components/atoms/Spinner.svelte';

	type Props = {
		/** 同期の状態 */
		status: 'idle' | 'syncing' | 'error';
		/** 取得済みの項目数(フォルダ+ファイル) */
		count: number;
		/** 再試行要求時の処理 */
		onretry: () => void;
	};

	let { status, count, onretry }: Props = $props();
</script>

{#if status === 'syncing'}
	<p role="status">
		<Spinner size={16} />
		<span>同期中 {count}件</span>
	</p>
{:else if status === 'error'}
	<p role="alert">
		<IconAlertCircle size={18} />
		<span>同期に失敗しました</span>
		<Button variant="text" onclick={onretry}>再試行</Button>
	</p>
{/if}

<style>
	p {
		display: flex;
		align-items: center;
		margin: 0;
		gap: 5px;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	p[role='alert'] {
		color: var(--color-danger);
	}
</style>
