import type { AccountRecord, FileRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import type { UploadClient } from '../../lib/services/upload';
import { driveTasks } from '../../lib/stores/drive-tasks';
import { queueStore } from '../../lib/stores/queue.svelte';
import { stubIndexedDb } from '../indexeddb-test-util';
import { toastStore } from '../../lib/stores/toast.svelte';

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

/**
 * テスト用のファイルキャッシュレコードを作る
 * @param id - ファイルID
 * @returns ファイルキャッシュレコード
 */
const makeFile = (id: string): FileRecord => ({
	accountId: 'a1',
	folderKey: '',
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
	folderId: null,
	userId: null,
});

/**
 * アップロード用クライアントのモックを作る(常にキャッシュ済みのf1を返す=既存扱い)
 * @returns クライアント
 */
const makeUploadClient = (): UploadClient => ({
	driveFilesCreate: () => Promise.resolve({ ...makeFile('f1'), folder: null, user: null }),
	driveFoldersCreate: () => Promise.reject(new Error('未使用')),
});

/** テストごとにIndexedDB(f1入り)、キュー、トーストを初期化する */
const reset = async () => {
	await queueStore.whenIdle();
	queueStore.clearFinished();
	for (const toast of toastStore.toasts) {
		toastStore.dismiss(toast.id);
	}
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('files', makeFile('f1'));
};

describe('アップロードのキュー投入', () => {
	beforeEach(reset);

	it('ファイル1件ならファイル名の表示名で積まれ、既存が返された件数をトーストで知らせる', async () => {
		const file = new File(['data'], 'a.png', { type: 'image/png' });
		const id = driveTasks.uploadEntries(
			account,
			{ entries: [{ file, path: [] }], targetFolderId: null },
			() => makeUploadClient(),
		);
		expect(id).not.toBeNull();
		expect(queueStore.tasks.at(-1)?.label).toBe('a.pngをアップロード');

		await queueStore.whenIdle();
		expect(toastStore.toasts.map((toast) => toast.message)).toStrictEqual([
			'1件は同じ内容のファイルが既にあるため、既存のファイルをそのまま使用しました',
		]);
	});

	it('複数ファイルは件数の表示名になり、対象が空なら積まない', () => {
		const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')];
		driveTasks.uploadFiles(account, { files, targetFolderId: 'd1' });
		expect(queueStore.tasks.at(-1)?.label).toBe('2件のアップロード');
		expect(driveTasks.uploadFiles(account, { files: [], targetFolderId: null })).toBeNull();
	});
});
