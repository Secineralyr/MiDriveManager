<script lang="ts">
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconTrash from '@tabler/icons-svelte/icons/trash';
	import IconX from '@tabler/icons-svelte/icons/x';

	type Props = {
		/** 選択中の件数 */
		count: number;
		/** 削除要求時の処理 */
		ondelete: () => void;
		/** 選択解除時の処理 */
		onclear: () => void;
	};

	let { count, ondelete, onclear }: Props = $props();
</script>

<p role="status">
	<span>{count}件選択</span>
	<span>
		<IconButton label="選択した項目を削除" onclick={ondelete}>
			<IconTrash size={16} />
		</IconButton>
		<IconButton label="選択を解除" onclick={onclear}>
			<IconX size={16} />
		</IconButton>
	</span>
</p>

<style>
	p {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 5px;
		margin: 0;
		padding: 4px 12px;
		gap: 10px;
		background-color: var(--color-surface-active);
	}

	p > span:first-child {
		font-size: 0.85rem;
		color: var(--color-text);
	}

	p > span:last-child {
		display: flex;
		align-items: center;
		gap: 5px;
	}
</style>
