<script module lang="ts">
	import type { AccountRecord } from '../../lib/db/schema';
	import Button from '$components/atoms/Button.svelte';
	import QueuePanel from '$components/organisms/QueuePanel.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { queueStore } from '../../lib/stores/queue.svelte';

	/** ストーリー用のアカウント */
	const account: AccountRecord = {
		id: 'misskey.example:u1',
		host: 'misskey.example',
		token: 'token-1',
		userId: 'u1',
		username: 'alice',
		name: 'アリス',
		avatarUrl: null,
		createdAt: '2026-08-21T00:00:00.000Z',
		lastSyncedAt: null,
	};

	/**
	 * 指定時間待つ
	 * @param ms - 待つ時間(ミリ秒)
	 * @returns 待機後に解決するPromise
	 */
	const wait = (ms: number) =>
		new Promise<void>((resolve) => {
			setTimeout(resolve, ms);
		});

	/** 1秒ごとに進捗を進めて5件で完了するタスクを積む */
	const enqueueProgress = () => {
		queueStore.enqueue({
			account,
			kind: 'upload',
			label: '5件のアップロード',
			run: async (report) => {
				report(0, 5);
				for (let done = 1; done <= 5; done += 1) {
					// oxlint-disable-next-line eslint/no-await-in-loop - 進捗の見た目を確認するための逐次待機
					await wait(1000);
					report(done, 5);
				}
			},
		});
	};

	/** 1秒後に失敗するタスクを積む */
	const enqueueFailure = () => {
		queueStore.enqueue({
			account,
			kind: 'delete',
			label: '3件の削除',
			run: async () => {
				await wait(1000);
				throw new Error('フォルダが空ではないため削除できません');
			},
		});
	};

	/** すぐに完了するタスクを積む */
	const enqueueInstant = () => {
		queueStore.enqueue({
			account,
			kind: 'move',
			label: '2件の移動',
			run: () => wait(250),
		});
	};

	const { Story } = defineMeta({
		title: 'organisms/QueuePanel',
		component: QueuePanel,
	});
</script>

<Story name="操作デモ">
	{#snippet template()}
		<div style="display: flex; gap: 10px;">
			<Button variant="tonal" onclick={enqueueProgress}>進捗付きタスク</Button>
			<Button variant="tonal" onclick={enqueueFailure}>失敗するタスク</Button>
			<Button variant="tonal" onclick={enqueueInstant}>すぐ完了するタスク</Button>
		</div>
		<QueuePanel />
	{/snippet}
</Story>
