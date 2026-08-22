<script lang="ts">
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconX from '@tabler/icons-svelte/icons/x';

	type Props = {
		/** 選択中の件数 */
		count: number;
		/** 選択解除時の処理 */
		onclear: () => void;
	};

	let { count, onclear }: Props = $props();
</script>

<p role="status">
	<span>{count}件選択</span>
	<IconButton label="選択を解除" onclick={onclear}>
		<IconX size={16} />
	</IconButton>
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

	span {
		font-size: 0.85rem;
		color: var(--color-text);
	}
</style>
