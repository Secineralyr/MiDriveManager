<script lang="ts">
	import AccountMenu from '$components/organisms/AccountMenu.svelte';
	import type { AccountRecord } from '../../lib/db/schema';
	import ContextMenu from '$components/molecules/ContextMenu.svelte';
	import SearchBox from '$components/molecules/SearchBox.svelte';
	import SyncIndicator from '$components/molecules/SyncIndicator.svelte';

	type Props = {
		/** アカウント一覧 */
		accounts: AccountRecord[];
		/** アクティブなアカウント */
		active: AccountRecord;
		/** 同期の状態 */
		syncStatus: 'idle' | 'syncing' | 'error';
		/** 同期で取得済みの項目数 */
		syncCount: number;
		/** アカウント切替時の処理 */
		onswitch: (accountId: string) => void;
		/** アカウント追加開始時の処理 */
		onadd: () => void;
		/** アカウント削除確定時の処理 */
		onremove: (accountId: string) => void;
		/** 再同期要求時の処理 */
		onresync: () => void;
		/** 検索語 */
		searchQuery: string;
		/** 検索語の入力時の処理 */
		onsearch: (query: string) => void;
		/** 検索解除時の処理 */
		onclearsearch: () => void;
		/** チュートリアル(使い方)の表示要求時の処理 */
		onshowtutorial: () => void;
	};

	let {
		accounts,
		active,
		syncStatus,
		syncCount,
		onswitch,
		onadd,
		onremove,
		onresync,
		searchQuery,
		onsearch,
		onclearsearch,
		onshowtutorial,
	}: Props = $props();

	/** アプリメニューの表示位置(閉じている時はnull) */
	let appMenuPosition = $state<{ x: number; y: number } | null>(null);

	/**
	 * ロゴの位置に合わせてアプリメニューを開く
	 * @param event - マウスイベント
	 */
	const handleLogoClick = (event: MouseEvent) => {
		if (event.currentTarget instanceof HTMLElement) {
			const rect = event.currentTarget.getBoundingClientRect();
			appMenuPosition = { x: rect.left, y: rect.bottom + 5 };
		}
	};
</script>

<header>
	<div>
		<div>
			<button type="button" aria-label="アプリメニュー" onclick={handleLogoClick}>
				<img src="/favicon.svg" alt="" />
			</button>
		</div>
		<div>
			<SearchBox value={searchQuery} oninput={onsearch} onclear={onclearsearch} />
		</div>
		<div>
			<SyncIndicator status={syncStatus} count={syncCount} onretry={onresync} />
			<AccountMenu {accounts} {active} {onswitch} {onadd} {onremove} />
		</div>
	</div>
</header>

<ContextMenu
	open={appMenuPosition !== null}
	x={appMenuPosition?.x ?? 0}
	y={appMenuPosition?.y ?? 0}
	items={[{ id: 'tutorial', label: '使い方を見る' }]}
	onselect={(id) => {
		if (id === 'tutorial') {
			onshowtutorial();
		}
	}}
	onclose={() => {
		appMenuPosition = null;
	}}
/>

<style>
	header {
		border-bottom: 1px solid var(--color-outline-weak);
		background-color: var(--color-bg);
	}

	header > div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 20px;
		gap: 10px;
	}

	header > div > div {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	/* 中央の検索ボックス */
	header > div > div:nth-child(2) {
		flex: 1;
		max-width: 480px;
	}

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: 0;
		border-radius: 5px;
		background-color: transparent;
		cursor: pointer;
		transition: background-color 250ms ease;
	}

	button:hover {
		background-color: var(--color-surface-hover);
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	img {
		border-radius: 5px;
		aspect-ratio: 1;
		inline-size: 30px;
	}
</style>
