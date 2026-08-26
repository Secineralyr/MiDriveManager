import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import {
	collectDuplicateSources,
	copyFilesToFolder,
	moveItems,
	selectItemsToMove,
} from '../../lib/services/drive-move';
import type { ActionsClient } from '../../lib/services/drive-actions';
import { stubIndexedDb } from '../indexeddb-test-util';

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
	isSensitive: true,
	blurhash: null,
	properties: {},
	url: `https://misskey.example/files/${id}`,
	thumbnailUrl: null,
	comment: '説明あり',
	folderId,
	userId: null,
});

/**
 * テスト用のフォルダキャッシュレコードを作る
 * @param id - フォルダID
 * @param parentId - 親フォルダID
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (id: string, parentId: string | null): FolderRecord => ({
	accountId: 'a1',
	parentKey: parentId ?? '',
	id,
	createdAt: '2026-08-23T00:00:00.000Z',
	name: `フォルダ${id}`,
	parentId,
});

/**
 * 移動系メソッドをモック化したクライアントを作る
 * @returns クライアントとモック
 */
const makeMoveClient = () => {
	const moveBulk = vi.fn<ActionsClient['driveFilesMoveBulk']>().mockResolvedValue({});
	const folderUpdate = vi
		.fn<ActionsClient['driveFoldersUpdate']>()
		.mockImplementation((params) =>
			Promise.resolve(makeFolder(params.folderId, params.parentId ?? null)),
		);
	const uploadFromUrl = vi.fn<ActionsClient['driveFilesUploadFromUrl']>().mockResolvedValue({});
	const fileUpdate = vi
		.fn<ActionsClient['driveFilesUpdate']>()
		.mockImplementation((params) =>
			Promise.resolve(makeFile(params.fileId, params.folderId ?? null)),
		);
	const client: ActionsClient = {
		driveFoldersCreate: () => Promise.reject(new Error('未使用')),
		driveFoldersUpdate: folderUpdate,
		driveFoldersDelete: () => Promise.resolve({}),
		driveFilesUpdate: fileUpdate,
		driveFilesDelete: () => Promise.resolve({}),
		driveFilesMoveBulk: moveBulk,
		driveFilesUploadFromUrl: uploadFromUrl,
	};
	return { client, moveBulk, folderUpdate, uploadFromUrl, fileUpdate };
};

/** テストごとにIndexedDBを初期化してサンプルデータを投入する */
const seed = async () => {
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('files', makeFile('f1', null));
	await db.put('files', makeFile('f2', null));
	await db.put('folders', makeFolder('d1', null));
	await db.put('folders', makeFolder('target', null));
};

describe('項目の移動', () => {
	beforeEach(seed);

	it('ファイルはまとめて移動されキャッシュも更新される', async () => {
		const { client, moveBulk } = makeMoveClient();
		await moveItems('a1', client, {
			items: [
				{ kind: 'file', id: 'f1' },
				{ kind: 'file', id: 'f2' },
			],
			targetFolderId: 'target',
		});
		expect(moveBulk).toHaveBeenCalledWith({ fileIds: ['f1', 'f2'], folderId: 'target' });
		const db = await openDatabase();
		const moved = await db.get('files', ['a1', 'f1']);
		expect(moved?.folderId).toBe('target');
		expect(moved?.folderKey).toBe('target');
	});

	it('フォルダは1件ずつ移動されキャッシュも更新される', async () => {
		const { client, folderUpdate, moveBulk } = makeMoveClient();
		await moveItems('a1', client, {
			items: [{ kind: 'folder', id: 'd1' }],
			targetFolderId: 'target',
		});
		expect(folderUpdate).toHaveBeenCalledWith({ folderId: 'd1', parentId: 'target' });
		expect(moveBulk).not.toHaveBeenCalled();
		const db = await openDatabase();
		const moved = await db.get('folders', ['a1', 'd1']);
		expect(moved?.parentId).toBe('target');
		expect(moved?.parentKey).toBe('target');
	});
});

describe('move-bulk非対応のフォールバック', () => {
	beforeEach(seed);

	it('move-bulkに失敗した場合は1件ずつの更新で移動され、キャッシュも更新される', async () => {
		const { client, moveBulk, fileUpdate } = makeMoveClient();
		moveBulk.mockRejectedValue(
			Object.assign(new Error('no such endpoint'), { code: 'NO_SUCH_ENDPOINT' }),
		);
		await moveItems('a1', client, {
			items: [
				{ kind: 'file', id: 'f1' },
				{ kind: 'file', id: 'f2' },
			],
			targetFolderId: 'target',
		});
		expect(fileUpdate).toHaveBeenCalledTimes(2);
		expect(fileUpdate).toHaveBeenCalledWith({ fileId: 'f1', folderId: 'target' });
		const db = await openDatabase();
		const moved = await db.get('files', ['a1', 'f2']);
		expect(moved?.folderKey).toBe('target');
	});
});

describe('移動の事前選別', () => {
	beforeEach(seed);

	it('すでに移動先にある項目と移動先自身は除外され、場所が変わる項目だけ残る', async () => {
		const kept = await selectItemsToMove(
			'a1',
			[
				{ kind: 'file', id: 'f1' },
				{ kind: 'folder', id: 'd1' },
				{ kind: 'folder', id: 'target' },
			],
			'target',
		);
		expect(kept).toStrictEqual([
			{ kind: 'file', id: 'f1' },
			{ kind: 'folder', id: 'd1' },
		]);

		const noMove = await selectItemsToMove(
			'a1',
			[
				{ kind: 'file', id: 'f1' },
				{ kind: 'folder', id: 'd1' },
			],
			null,
		);
		expect(noMove).toStrictEqual([]);
	});

	it('キャッシュに無い項目は判定できないため移動対象として残る', async () => {
		const kept = await selectItemsToMove('a1', [{ kind: 'file', id: 'nope' }], null);
		expect(kept).toStrictEqual([{ kind: 'file', id: 'nope' }]);
	});
});

describe('複製の対象収集', () => {
	beforeEach(seed);

	it('ファイルのキャッシュだけが集まり、1件も見つからない場合はエラーになる', async () => {
		const files = await collectDuplicateSources('a1', [
			{ kind: 'file', id: 'f1' },
			{ kind: 'folder', id: 'd1' },
		]);
		expect(files.map((file) => file.id)).toStrictEqual(['f1']);

		await expect(collectDuplicateSources('a1', [{ kind: 'file', id: 'nope' }])).rejects.toThrow(
			'複製できるファイルが見つかりません',
		);
	});
});

describe('移動の制約', () => {
	beforeEach(seed);

	it('移動先のフォルダ自身が対象に含まれる場合は除外される', async () => {
		const { client, folderUpdate } = makeMoveClient();
		await moveItems('a1', client, {
			items: [{ kind: 'folder', id: 'target' }],
			targetFolderId: 'target',
		});
		expect(folderUpdate).not.toHaveBeenCalled();
	});

	it('循環になる移動のエラーは日本語メッセージへ変換される', async () => {
		const { client, folderUpdate } = makeMoveClient();
		folderUpdate.mockRejectedValue(
			Object.assign(new Error('recursive'), { code: 'RECURSIVE_NESTING' }),
		);
		await expect(
			moveItems('a1', client, {
				items: [{ kind: 'folder', id: 'd1' }],
				targetFolderId: 'target',
			}),
		).rejects.toThrow('フォルダを自身の中へ移動することはできません');
	});
});

describe('ファイルの複製(URL取り込み)', () => {
	beforeEach(seed);

	it('各ファイルのURLとメタデータで取り込みが呼ばれる', async () => {
		const { client, uploadFromUrl } = makeMoveClient();
		await copyFilesToFolder(client, {
			files: [makeFile('f1', null)],
			targetFolderId: 'target',
		});
		expect(uploadFromUrl).toHaveBeenCalledWith({
			url: 'https://misskey.example/files/f1',
			folderId: 'target',
			isSensitive: true,
			comment: '説明あり',
		});
	});

	it('取り込みに失敗した時点で後続は実行されない', async () => {
		const { client, uploadFromUrl } = makeMoveClient();
		let calls = 0;
		uploadFromUrl.mockImplementation(() => {
			calls += 1;
			return Promise.reject(new Error('失敗'));
		});
		await expect(
			copyFilesToFolder(client, {
				files: [makeFile('f1', null), makeFile('f2', null)],
				targetFolderId: null,
			}),
		).rejects.toThrow('失敗');
		expect(calls).toBe(1);
	});
});
