<script lang="ts">
	import AccountMenu from '$components/organisms/AccountMenu.svelte';
	import type { AccountRecord } from '../../lib/db/schema';

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
</script>

<header>
	<div>
		<div>
			<img src="/favicon.svg" alt="" />
			<p>misskeyDriveManager</p>
		</div>
		<div>
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
