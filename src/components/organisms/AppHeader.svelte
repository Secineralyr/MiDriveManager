<script lang="ts">
	import AccountMenu from '$components/organisms/AccountMenu.svelte';
	import type { AccountRecord } from '../../lib/db/schema';
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
	}: Props = $props();
</script>

<header>
	<div>
		<div>
			<!-- NOTE: 今後全体メニューを置くときに使う -->
			<!-- <img src="/favicon.svg" alt="" /> -->
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

	img {
		border-radius: 5px;
		aspect-ratio: 1;
		inline-size: 30px;
	}

	p {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
	}
</style>
