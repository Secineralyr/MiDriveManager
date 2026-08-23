<script lang="ts">
	import type { AccountRecord } from '../../lib/db/schema';
	import type { SyncClient } from '../../lib/services/sync';
	import { syncStore } from '../../lib/stores/sync.svelte';

	/** App.svelteと同じく、$effectから同期を開始する挙動を再現するテスト用コンポーネント */
	type Props = {
		/** 同期するアカウント */
		account: AccountRecord;
		/** 同期用クライアントの生成関数 */
		clientFactory: () => SyncClient;
		/** effectが実行されるたびに呼ばれる */
		oneffect: () => void;
	};

	let { account, clientFactory, oneffect }: Props = $props();

	$effect(() => {
		oneffect();
		syncStore.run(account, clientFactory);
	});
</script>
