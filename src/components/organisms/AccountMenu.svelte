<script lang="ts">
	import AccountMenuItem from '$components/molecules/AccountMenuItem.svelte';
	import type { AccountRecord } from '../../lib/db/schema';
	import Avatar from '$components/atoms/Avatar.svelte';
	import BottomSheet from '$components/molecules/BottomSheet.svelte';
	import ConfirmDialog from '$components/molecules/ConfirmDialog.svelte';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconTrash from '@tabler/icons-svelte/icons/trash';
	import Spinner from '$components/atoms/Spinner.svelte';
	import { longPress } from '../../lib/utils/long-press';
	import { popIn } from '../../lib/utils/transitions';

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
		/** スマートフォン表示かどうか(メニューを下から出るシートにする) */
		phone?: boolean;
		/** アイコンの角に出す進行状況の印(idleなら出さない) */
		indicator?: 'idle' | 'running' | 'failed';
		/** アイコンの長押し時の処理(指定した場合だけ長押しを受け付ける) */
		onlongpress?: () => void;
	};

	let {
		accounts,
		active,
		onswitch,
		onadd,
		onremove,
		phone = false,
		indicator = 'idle',
		onlongpress,
	}: Props = $props();

	// 長押し時の処理(長押しを受け付けない時はundefinedにしてアクションを無効にする)
	const handleLongPress = $derived(
		onlongpress === undefined
			? undefined
			: () => {
					onlongpress();
				},
	);

	/**
	 * 長押しを受け付ける時は、ブラウザの右クリックメニュー(Androidの長押し)を出さない
	 * @param event - マウスイベント
	 */
	const handleContextMenu = (event: MouseEvent) => {
		if (onlongpress !== undefined) {
			event.preventDefault();
		}
	};

	let open = $state(false);
	let confirmingRemove = $state(false);
	let container = $state<HTMLElement | null>(null);

	/**
	 * メニューの外側をポインタで押した時にメニューを閉じる
	 * @param event - ポインタイベント
	 */
	const handleOutsidePointer = (event: PointerEvent) => {
		// シート表示(スマートフォン)ではシート側のスクリムで閉じる
		if (!open || container === null || phone) {
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

{#snippet entries()}
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
{/snippet}

<div bind:this={container} data-tour="account">
	<button
		type="button"
		aria-label="アカウントメニュー"
		onclick={() => {
			open = !open;
		}}
		oncontextmenu={handleContextMenu}
		use:longPress={handleLongPress}
	>
		<Avatar src={active.avatarUrl} alt={active.name} size={35} />
	</button>
	{#if indicator !== 'idle'}
		<span data-indicator={indicator} aria-hidden="true">
			{#if indicator === 'running'}
				<Spinner size={12} />
			{/if}
		</span>
	{/if}
	{#if !phone && open}
		<menu transition:popIn>
			{@render entries()}
		</menu>
	{/if}
</div>

{#if phone}
	<BottomSheet
		{open}
		title="アカウント"
		onclose={() => {
			open = false;
		}}
	>
		<menu data-sheet>
			{@render entries()}
		</menu>
	</BottomSheet>
{/if}

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

	/* アイコンの角に重ねる進行状況の印 */
	div > span[data-indicator] {
		display: inline-flex;
		position: absolute;
		right: 0;
		bottom: 0;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--color-bg);
		border-radius: 9999px;
		background-color: var(--color-bg);
		pointer-events: none;
	}

	div > span[data-indicator='failed'] {
		background-color: var(--color-danger);
		min-width: 12px;
		min-height: 12px;
	}

	menu {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 100;
		transform-origin: top right;
		margin: 5px 0;
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 5px;
		min-width: 260px;
		background-color: var(--color-surface);
		list-style: none;
	}

	/* シート表示ではポップアップの枠を外し、シートの中身として並べる */
	menu[data-sheet] {
		position: static;
		margin: 0;
		border: 0;
		padding: 0;
		min-width: 0;
		background-color: transparent;
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

	/* タッチ操作の端末: ポップアップの項目を大きくして誤タップを防ぐ */
	@media (pointer: coarse) {
		li > button {
			padding: 12px 10px;
			font-size: 1.05rem;
		}
	}

	/* シート表示では誤タップしにくいように、追加・削除の行を大きくして間隔を空ける */
	menu[data-sheet] hr {
		margin: 10px 0;
	}

	menu[data-sheet] li > button {
		padding: 15px 10px;
		font-size: 1.15rem;
	}
</style>
