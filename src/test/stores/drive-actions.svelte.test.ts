import { beforeEach, describe, expect, it } from 'vitest';
import type { AccountRecord } from '../../lib/db/schema';
import type { ActionsClient } from '../../lib/services/drive-actions';
import { closeDatabase } from '../../lib/db/database';
import { driveActionsStore } from '../../lib/stores/drive-actions.svelte';
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

/** APIレスポンス用のフォルダエンティティ */
const apiFolder: entities.DriveFolder = {
	id: 'new1',
	createdAt: '2026-08-23T00:00:00.000Z',
	name: '新規',
	parentId: null,
};

/**
 * 固定レスポンスを返すAPIクライアントを作る
 * @param overrides - 上書きするメソッド
 * @returns 基本操作用のAPIクライアント
 */
const makeClient = (overrides: Partial<ActionsClient> = {}): ActionsClient => ({
	driveFoldersCreate: () => Promise.resolve(apiFolder),
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

	it('成功するとtrueを返しエラーは残らない', async () => {
		const ok = await driveActionsStore.createFolder(
			account,
			{ name: '新規', parentId: null },
			() => makeClient(),
		);
		expect(ok).toBe(true);
		expect(driveActionsStore.busy).toBe(false);
		expect(driveActionsStore.error).toBeNull();
	});

	it('失敗するとfalseを返しエラーメッセージが保持される', async () => {
		const failing = makeClient({
			driveFoldersCreate: () => Promise.reject(new Error('作成に失敗しました')),
		});
		const ok = await driveActionsStore.createFolder(
			account,
			{ name: '新規', parentId: null },
			() => failing,
		);
		expect(ok).toBe(false);
		expect(driveActionsStore.error).toBe('作成に失敗しました');
		driveActionsStore.clearError();
		expect(driveActionsStore.error).toBeNull();
	});

	it('実行中は別の操作を受け付けない', async () => {
		const gate = Promise.withResolvers<entities.DriveFolder>();
		const slow = makeClient({ driveFoldersCreate: () => gate.promise });
		const first = driveActionsStore.createFolder(
			account,
			{ name: 'a', parentId: null },
			() => slow,
		);
		const second = await driveActionsStore.createFolder(
			account,
			{ name: 'b', parentId: null },
			() => makeClient(),
		);
		expect(second).toBe(false);
		gate.resolve(apiFolder);
		await expect(first).resolves.toBe(true);
	});
});
