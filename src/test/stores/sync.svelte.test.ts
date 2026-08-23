import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountRecord } from '../../lib/db/schema';
import type { SyncClient } from '../../lib/services/sync';
import SyncEffectRunner from '../fixtures/SyncEffectRunner.svelte';
import { closeDatabase } from '../../lib/db/database';
import { render } from '@testing-library/svelte';
import { stubIndexedDb } from '../indexeddb-test-util';
import { syncStore } from '../../lib/stores/sync.svelte';

/**
 * テスト用のアカウントを作る
 * @param id - アプリ内アカウントID
 * @returns アカウント
 */
const makeAccount = (id: string): AccountRecord => ({
	id,
	host: 'misskey.example',
	token: `token-${id}`,
	userId: `user-${id}`,
	username: 'alice',
	name: 'アリス',
	avatarUrl: null,
	createdAt: '2026-08-21T00:00:00.000Z',
	lastSyncedAt: null,
});

/**
 * 空のドライブを返す同期用クライアントを作る
 * @returns 同期用クライアント
 */
const makeEmptyClient = (): SyncClient => ({
	driveFolders: () => Promise.resolve([]),
	driveStream: () => Promise.resolve([]),
});

/** テストごとにIndexedDBを初期化する */
const resetDb = async () => {
	await closeDatabase();
	stubIndexedDb();
};

describe('同期の実行', () => {
	beforeEach(resetDb);

	it('同期に成功するとidleに戻り件数が反映される', async () => {
		syncStore.run(makeAccount('a1'), () => makeEmptyClient());
		expect(syncStore.status).toBe('syncing');
		await vi.waitFor(() => {
			expect(syncStore.status).toBe('idle');
		});
		expect(syncStore.accountId).toBe('a1');
		expect(syncStore.error).toBeNull();
	});

	it('同期に失敗するとerrorになりメッセージが保持される', async () => {
		const failingClient: SyncClient = {
			driveFolders: () => Promise.reject(new Error('接続に失敗しました')),
			driveStream: () => Promise.resolve([]),
		};
		syncStore.run(makeAccount('a1'), () => failingClient);
		await vi.waitFor(() => {
			expect(syncStore.status).toBe('error');
		});
		expect(syncStore.error).toBe('接続に失敗しました');
	});
});

describe('多重実行の制御', () => {
	beforeEach(resetDb);

	it('同じアカウントの同期中に再度runしても新しい同期は開始されない', async () => {
		const gate = Promise.withResolvers<void>();
		const slowClient: SyncClient = {
			driveFolders: async () => {
				await gate.promise;
				return [];
			},
			driveStream: () => Promise.resolve([]),
		};
		let factoryCalls = 0;
		/**
		 * 呼び出し回数を数えるクライアント生成関数
		 * @returns 同期用クライアント
		 */
		const factory = () => {
			factoryCalls += 1;
			return slowClient;
		};
		syncStore.run(makeAccount('a1'), factory);
		syncStore.run(makeAccount('a1'), factory);
		expect(factoryCalls).toBe(1);
		gate.resolve();
		await vi.waitFor(() => {
			expect(syncStore.status).toBe('idle');
		});
	});

	it('別アカウントの同期を開始すると新しい同期の状態が反映される', async () => {
		syncStore.run(makeAccount('a1'), () => makeEmptyClient());
		syncStore.run(makeAccount('a2'), () => makeEmptyClient());
		await vi.waitFor(() => {
			expect(syncStore.status).toBe('idle');
		});
		expect(syncStore.accountId).toBe('a2');
	});
});

/**
 * 同期が完了(idle)するまで待つ
 */
const waitForIdle = async () => {
	for (let attempt = 0; attempt < 50 && syncStore.status === 'syncing'; attempt += 1) {
		// oxlint-disable-next-line eslint/no-await-in-loop - 完了を待つポーリング
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 10);
		});
	}
};

describe('$effectからの同期開始', () => {
	beforeEach(resetDb);

	it('同期の完了でeffectが再実行されず、APIの呼び出しは1回で止まる', async () => {
		const calls = { effect: 0, stream: 0 };
		const client: SyncClient = {
			driveFolders: () => Promise.resolve([]),
			driveStream: () => {
				calls.stream += 1;
				return Promise.resolve([]);
			},
		};
		render(SyncEffectRunner, {
			props: {
				account: makeAccount('effect'),
				clientFactory: () => client,
				oneffect: () => {
					calls.effect += 1;
				},
			},
		});

		await waitForIdle();
		await waitForIdle();
		expect(syncStore.status).toBe('idle');
		expect(calls).toStrictEqual({ effect: 1, stream: 1 });
	});
});
