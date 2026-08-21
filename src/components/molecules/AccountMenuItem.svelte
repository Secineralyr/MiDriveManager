<script lang="ts">
	import type { AccountRecord } from '../../lib/db/schema';
	import Avatar from '$components/atoms/Avatar.svelte';
	import IconCheck from '@tabler/icons-svelte/icons/check';

	type Props = {
		/** 表示するアカウント */
		account: AccountRecord;
		/** アクティブなアカウントかどうか */
		active: boolean;
		/** 選択時の処理 */
		onselect: () => void;
	};

	let { account, active, onselect }: Props = $props();
</script>

<button type="button" onclick={onselect}>
	<Avatar src={account.avatarUrl} alt={account.name} />
	<span>
		<strong>{account.name}</strong>
		<small>@{account.username}@{account.host}</small>
	</span>
	{#if active}
		<IconCheck size={18} />
	{/if}
</button>

<style>
	button {
		display: flex;
		align-items: center;
		padding: 8px 10px;
		border: 0;
		border-radius: 5px;
		gap: 10px;
		background-color: transparent;
		font-family: inherit;
		font-size: 1rem;
		text-align: left;
		color: var(--color-text);
		cursor: pointer;
		inline-size: 100%;
		transition: background-color 250ms ease;
	}

	button:hover {
		background-color: var(--color-surface-hover);
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	span {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	strong {
		overflow: hidden;
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	small {
		overflow: hidden;
		font-size: 0.85rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text-muted);
	}
</style>
