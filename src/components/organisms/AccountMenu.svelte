<script lang="ts">
	import AccountMenuItem from '$components/molecules/AccountMenuItem.svelte';
	import type { AccountRecord } from '../../lib/db/schema';
	import Avatar from '$components/atoms/Avatar.svelte';
	import ConfirmDialog from '$components/molecules/ConfirmDialog.svelte';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconTrash from '@tabler/icons-svelte/icons/trash';

	type Props = {
		/** アカウント一覧 */
		accounts: AccountRecord[];
		/** アクティブなアカウント */
		active: AccountRecord;
		/** アカウント切替時の処理 */
		onswitch: (accountId: string) => void;
		/** アカウント追加開始時の処理 */
		onadd: () => void;
		/** アカウント削除確定時の処理 */
		onremove: (accountId: string) => void;
	};

	let { accounts, active, onswitch, onadd, onremove }: Props = $props();

	let open = $state(false);
	let confirmingRemove = $state(false);
	let container = $state<HTMLElement | null>(null);

	/**
	 * メニューの外側をポインタで押した時にメニューを閉じる
	 * @param event - ポインタイベント
	 */
	const handleOutsidePointer = (event: PointerEvent) => {
		if (!open || container === null) {
			return;
		}
		if (event.target instanceof Node && !container.contains(event.target)) {
			open = false;
		}
	};

	/**
	 * アカウントを選択して切り替える
	 * @param account - 選択されたアカウント
	 */
	const handleSelect = (account: AccountRecord) => {
		open = false;
		if (account.id !== active.id) {
			onswitch(account.id);
		}
	};

	/** アカウント追加を開始する */
	const handleAdd = () => {
		open = false;
		onadd();
	};

	/** 削除確認ダイアログを開く */
	const handleRemoveRequest = () => {
		open = false;
		confirmingRemove = true;
	};

	/** 削除を確定する */
	const handleRemoveConfirm = () => {
		confirmingRemove = false;
		onremove(active.id);
	};
</script>

<svelte:window onpointerdown={handleOutsidePointer} />

<div bind:this={container}>
	<button
		type="button"
		aria-label="アカウントメニュー"
		onclick={() => {
			open = !open;
		}}
	>
		<Avatar src={active.avatarUrl} alt={active.name} size={35} />
	</button>
	{#if open}
		<menu>
			{#each accounts as account (account.id)}
				<li>
					<AccountMenuItem
						{account}
						active={account.id === active.id}
						onselect={() => {
							handleSelect(account);
						}}
					/>
				</li>
			{/each}
			<li>
				<hr />
			</li>
			<li>
				<button type="button" onclick={handleAdd}>
					<IconPlus size={18} />
					アカウントを追加
				</button>
			</li>
			<li>
				<button type="button" data-danger onclick={handleRemoveRequest}>
					<IconTrash size={18} />
					このアカウントを削除
				</button>
			</li>
		</menu>
	{/if}
</div>

<ConfirmDialog
	open={confirmingRemove}
	title="アカウントの削除"
	message="{active.name}(@{active.username}@{active.host})をこのアプリから削除します。サーバー上のデータは削除されません。"
	confirmLabel="削除"
	danger
	onconfirm={handleRemoveConfirm}
	oncancel={() => {
		confirmingRemove = false;
	}}
/>

<style>
	div {
		display: flex;
		position: relative;
	}

	div > button {
		display: flex;
		padding: 0;
		border: 0;
		border-radius: 9999px;
		background-color: transparent;
		cursor: pointer;
		transition: scale 250ms ease;
	}

	div > button:hover {
		scale: 1.1;
	}

	div > button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	menu {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 100;
		margin: 5px 0;
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 5px;
		min-width: 260px;
		background-color: var(--color-surface);
		list-style: none;
	}

	li {
		display: flex;
		flex-direction: column;
	}

	hr {
		border: 0;
		border-top: 1px solid var(--color-outline-weak);
		margin: 5px 0;
		inline-size: 100%;
	}

	li > button {
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
		transition: background-color 250ms ease;
	}

	li > button:hover {
		background-color: var(--color-surface-hover);
	}

	li > button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	li > button[data-danger] {
		color: var(--color-danger);
	}
</style>
