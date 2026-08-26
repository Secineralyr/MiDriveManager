import type { AccountRecord, FileRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import type { ActionsClient } from '../../lib/services/drive-actions';
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
 * 各操作をモック化したクライアントを作る
 * @returns クライアントとモック
 */
const makeClient = () => {
	const fileDelete = vi.fn<ActionsClient['driveFilesDelete']>().mockResolvedValue({});
	const moveBulk = vi.fn<ActionsClient['driveFilesMoveBulk']>().mockResolvedValue({});
	const folderCreate = vi.fn<ActionsClient['driveFoldersCreate']>().mockImplementation((params) =>
		Promise.resolve({
			id: 'new1',
			createdAt: '2026-08-23T00:00:00.000Z',
			name: params.name ?? '',
			parentId: params.parentId ?? null,
		}),
	);
	const client: ActionsClient = {
		driveFoldersCreate: folderCreate,
		driveFoldersUpdate: () => Promise.reject(new Error('未使用')),
		driveFoldersDelete: () => Promise.resolve({}),
		driveFilesUpdate: () => Promise.reject(new Error('未使用')),
		driveFilesDelete: fileDelete,
		driveFilesMoveBulk: moveBulk,
	};
	return { client, fileDelete, moveBulk, folderCreate };
};

/**
 * 識別子でタスクを探す
 * @param id - タスクの識別子(積まれなかった場合のnullも受け、見つからない扱いにする)
 * @returns タスク
 * @throws {Error} タスクが見つからない場合
 */
const findTask = (id: number | null) => {
	const task = queueStore.tasks.find((candidate) => candidate.id === id);
	if (task === undefined) {
		throw new Error('タスクが見つかりません');
	}

	return task;
};

/** テストごとにIndexedDBとキューを初期化し、アカウントのドライブを開いておく */
const reset = async () => {
	await queueStore.whenIdle();
	queueStore.clearFinished();
	await closeDatabase();
	stubIndexedDb();
	// 複製後の全量同期が実ネットワークへ出ないようにする
	vi.stubGlobal(
		'fetch',
		vi.fn<() => Promise<never>>().mockRejectedValue(new Error('テストではネットワーク不可')),
	);
	const db = await openDatabase();
	await db.put('files', makeFile('f1'));
	await db.put('files', makeFile('f2'));
	await driveStore.openAccount('a1');
};

describe('フォルダ作成のキュー投入', () => {
	beforeEach(reset);

	it('フォルダ作成はキューで実行され、完了後に表示中のドライブへ反映される', async () => {
		const { client, folderCreate } = makeClient();
		const id = driveTasks.createFolder(account, { name: '新規', parentId: null }, () => client);
		expect(findTask(id).kind).toBe('create');
		expect(findTask(id).label).toBe('フォルダ「新規」を作成');

		await queueStore.whenIdle();
		expect(folderCreate).toHaveBeenCalledWith({ name: '新規', parentId: null });
		expect(findTask(id).status).toBe('done');
		expect(driveStore.childFolders.map((folder) => folder.id)).toStrictEqual(['new1']);
	});
});

describe('削除のキュー投入', () => {
	beforeEach(reset);

	it('削除はキューで実行され、完了後に表示中のドライブが再読み込みされる', async () => {
		const { client, fileDelete } = makeClient();
		const id = driveTasks.deleteItems(
			account,
			[
				{ kind: 'file', id: 'f1' },
				{ kind: 'file', id: 'f2' },
			],
			() => client,
		);
		expect(findTask(id).label).toBe('2件の削除');

		await queueStore.whenIdle();
		expect(fileDelete).toHaveBeenCalledWith({ fileId: 'f2' });
		expect(findTask(id).progress).toStrictEqual({ done: 2, total: 2 });
		expect(driveStore.files).toStrictEqual([]);
	});
});

describe('移動の事前選別', () => {
	beforeEach(reset);

	it('すでに移動先にある項目だけの場合はキューへ積まれず、APIも呼ばれない', async () => {
		const { client, moveBulk } = makeClient();
		const before = queueStore.tasks.length;
		const id = await driveTasks.moveItems(
			account,
			{ items: [{ kind: 'file', id: 'f1' }], targetFolderId: null },
			() => client,
		);
		expect(id).toBeNull();
		expect(queueStore.tasks).toHaveLength(before);
		await queueStore.whenIdle();
		expect(moveBulk).not.toHaveBeenCalled();
	});

	it('移動が必要な項目だけがキューとAPIの対象になる', async () => {
		const db = await openDatabase();
		await db.put('files', { ...makeFile('f2'), folderId: 'd1', folderKey: 'd1' });
		const { client, moveBulk } = makeClient();
		const id = await driveTasks.moveItems(
			account,
			{
				items: [
					{ kind: 'file', id: 'f1' },
					{ kind: 'file', id: 'f2' },
				],
				targetFolderId: 'd1',
			},
			() => client,
		);
		expect(id).not.toBeNull();
		expect(queueStore.tasks.at(-1)?.label).toBe('1件の移動');
		await queueStore.whenIdle();
		expect(moveBulk).toHaveBeenCalledWith({ fileIds: ['f1'], folderId: 'd1' });
	});
});

describe('移動のキュー投入', () => {
	beforeEach(reset);

	it('移動はキューで実行され、失敗した場合はエラーがタスクに残る', async () => {
		const { client, moveBulk } = makeClient();
		moveBulk.mockRejectedValue(new Error('移動できませんでした'));
		// bulkの失敗時は1件ずつの移動へフォールバックするため、そちらも同じ理由で失敗させる
		client.driveFilesUpdate = () => Promise.reject(new Error('移動できませんでした'));
		const id = await driveTasks.moveItems(
			account,
			{ items: [{ kind: 'file', id: 'f1' }], targetFolderId: 'd1' },
			() => client,
		);

		await queueStore.whenIdle();
		expect(moveBulk).toHaveBeenCalledWith({ fileIds: ['f1'], folderId: 'd1' });
		expect(findTask(id).status).toBe('failed');
		expect(findTask(id).error).toBe('移動できませんでした');
	});
});
