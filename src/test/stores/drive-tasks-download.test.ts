import type { AccountRecord, FileRecord, FolderRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import { driveStore } from '../../lib/stores/drive.svelte';
import { driveTasks } from '../../lib/stores/drive-tasks';
import { queueStore } from '../../lib/stores/queue.svelte';
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

/** テスト用のフォルダ */
const folder: FolderRecord = {
	accountId: 'a1',
	parentKey: '',
	id: 'd1',
	createdAt: '2026-08-21T00:00:00.000Z',
	name: '写真',
	parentId: null,
};

/**
 * テスト用のファイルキャッシュレコードを作る
 * @param id - ファイルID
 * @param folderId - 所属フォルダID
 * @returns ファイルキャッシュレコード
 */
const makeFile = (id: string, folderId: string | null): FileRecord => ({
	accountId: 'a1',
	folderKey: folderId ?? '',
	id,
	createdAt: '2026-08-23T00:00:00.000Z',
	name: `${id}.png`,
	type: 'image/png',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: 100,
	isSensitive: false,
	blurhash: null,
	properties: {},
	url: `https://misskey.example/files/${id}`,
	thumbnailUrl: null,
	comment: null,
	folderId,
	userId: null,
});

/**
 * 取得と保存の差し替えを作る(取得は常に成功し、保存名を記録する)
 * @returns 差し替えと記録
 */
const makeOverrides = () => {
	const savedNames: string[] = [];
	return {
		savedNames,
		overrides: {
			fetchImpl: (url: string) => Promise.resolve(new Response(url, { status: 200 })),
			save: (_blob: Blob, name: string) => {
				savedNames.push(name);
			},
		},
	};
};

/** テストごとにIndexedDB(ルートにf1、写真フォルダにf2)とキューを初期化し、アカウントを開く */
const reset = async () => {
	await queueStore.whenIdle();
	queueStore.clearFinished();
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('folders', folder);
	await db.put('files', makeFile('f1', null));
	await db.put('files', makeFile('f2', 'd1'));
	await driveStore.openAccount('a1');
};

describe('ダウンロードのキュー投入', () => {
	beforeEach(reset);

	it('ファイル1件は名前付きの表示名で積まれ、そのままの名前で保存される', async () => {
		const { overrides, savedNames } = makeOverrides();
		const id = driveTasks.download(account, [{ kind: 'file', id: 'f1' }], overrides);
		expect(queueStore.tasks.at(-1)?.label).toBe('f1.pngをダウンロード');

		await queueStore.whenIdle();
		expect(queueStore.tasks.find((task) => task.id === id)?.status).toBe('done');
		expect(savedNames).toStrictEqual(['f1.png']);
	});

	it('フォルダ1件はフォルダ名のzipとして保存される', async () => {
		const { overrides, savedNames } = makeOverrides();
		driveTasks.download(account, [{ kind: 'folder', id: 'd1' }], overrides);
		await queueStore.whenIdle();
		expect(savedNames).toStrictEqual(['写真.zip']);
	});

	it('対象が空なら積まず、ファイルが見つからなければ失敗する', async () => {
		const { overrides } = makeOverrides();
		expect(driveTasks.download(account, [], overrides)).toBeNull();
		const id = driveTasks.download(account, [{ kind: 'file', id: '存在しない' }], overrides);
		await queueStore.whenIdle();
		expect(queueStore.tasks.find((task) => task.id === id)?.error).toBe(
			'ダウンロードできるファイルがありません',
		);
	});
});
