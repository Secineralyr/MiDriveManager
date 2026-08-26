import { beforeEach, describe, expect, it } from 'vitest';
import type { AccountRecord } from '../../lib/db/schema';
import type { ActionsClient } from '../../lib/services/drive-actions';
import { closeDatabase } from '../../lib/db/database';
import { driveActionsStore } from '../../lib/stores/drive-actions.svelte';
import { driveStore } from '../../lib/stores/drive.svelte';
import type { entities } from 'misskey-js';
import { stubIndexedDb } from '../indexeddb-test-util';

/** テスト用のアカウント */
const account: AccountRecord = {
	id: 'a1',
	host: 'misskey.example',
	token: 'token-1',
	userId: 'u1',
	username: 'alice',
	name: 'アリス',
	avatarUrl: null,
	createdAt: '2026-08-21T00:00:00.000Z',
	lastSyncedAt: null,
};

/** APIレスポンス用のフォルダエンティティ(名前の変更後) */
const apiFolder: entities.DriveFolder = {
	id: 'd1',
	createdAt: '2026-08-23T00:00:00.000Z',
	name: '変更後',
	parentId: null,
};

/**
 * 固定レスポンスを返すAPIクライアントを作る
 * @param overrides - 上書きするメソッド
 * @returns 基本操作用のAPIクライアント
 */
const makeClient = (overrides: Partial<ActionsClient> = {}): ActionsClient => ({
	driveFoldersCreate: () => Promise.reject(new Error('未使用')),
	driveFoldersUpdate: () => Promise.resolve(apiFolder),
	driveFoldersDelete: () => Promise.resolve({}),
	driveFilesUpdate: () => Promise.reject(new Error('未使用')),
	driveFilesDelete: () => Promise.resolve({}),
	driveFilesMoveBulk: () => Promise.resolve({}),
	driveFilesUploadFromUrl: () => Promise.resolve({}),
	...overrides,
});

describe('基本操作ストア', () => {
	beforeEach(async () => {
		await closeDatabase();
		stubIndexedDb();
	});

	it('成功するとtrueを返しエラーは残らず、表示中のドライブが再読み込みされる', async () => {
		await driveStore.openAccount('a1');
		const ok = await driveActionsStore.rename(
			account,
			{ item: { kind: 'folder', id: 'd1' }, name: '変更後' },
			() => makeClient(),
		);
		expect(ok).toBe(true);
		expect(driveActionsStore.busy).toBe(false);
		expect(driveActionsStore.error).toBeNull();
		expect(driveStore.childFolders.map((folder) => folder.name)).toStrictEqual(['変更後']);
	});

	it('失敗するとfalseを返しエラーメッセージが保持される', async () => {
		const failing = makeClient({
			driveFoldersUpdate: () => Promise.reject(new Error('変更に失敗しました')),
		});
		const ok = await driveActionsStore.rename(
			account,
			{ item: { kind: 'folder', id: 'd1' }, name: '変更後' },
			() => failing,
		);
		expect(ok).toBe(false);
		expect(driveActionsStore.error).toBe('変更に失敗しました');
		driveActionsStore.clearError();
		expect(driveActionsStore.error).toBeNull();
	});
});

describe('基本操作ストアの多重実行', () => {
	beforeEach(async () => {
		await closeDatabase();
		stubIndexedDb();
	});

	it('実行中は別の操作を受け付けない', async () => {
		const gate = Promise.withResolvers<entities.DriveFolder>();
		const slow = makeClient({ driveFoldersUpdate: () => gate.promise });
		const first = driveActionsStore.rename(
			account,
			{ item: { kind: 'folder', id: 'd1' }, name: 'a' },
			() => slow,
		);
		const second = await driveActionsStore.rename(
			account,
			{ item: { kind: 'folder', id: 'd1' }, name: 'b' },
			() => makeClient(),
		);
		expect(second).toBe(false);
		gate.resolve(apiFolder);
		await expect(first).resolves.toBe(true);
	});
});
