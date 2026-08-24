import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import {
	createFolder,
	deleteItems,
	renameFile,
	renameFolder,
	updateFileMetadata,
} from '../../lib/services/drive-actions';
import type { ActionsClient } from '../../lib/services/drive-actions';
import type { entities } from 'misskey-js';
import { stubIndexedDb } from '../indexeddb-test-util';

/**
 * APIレスポンス用のフォルダエンティティを作る
 * @param folder - フォルダのID・名前・親フォルダID
 * @returns フォルダエンティティ
 */
const makeApiFolder = (folder: {
	id: string;
	name: string;
	parentId: string | null;
}): entities.DriveFolder => ({
	id: folder.id,
	createdAt: '2026-08-23T00:00:00.000Z',
	name: folder.name,
	parentId: folder.parentId,
});

/**
 * APIレスポンス用のファイルエンティティを作る
 * @param file - ファイルのID・名前・説明・センシティブ
 * @returns ファイルエンティティ
 */
const makeApiFile = (file: {
	id: string;
	name: string;
	comment?: string | null;
	isSensitive?: boolean;
}): entities.DriveFile => ({
	id: file.id,
	createdAt: '2026-08-23T00:00:00.000Z',
	name: file.name,
	type: 'image/png',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: 100,
	isSensitive: file.isSensitive ?? false,
	blurhash: null,
	properties: {},
	url: `https://misskey.example/files/${file.id}`,
	thumbnailUrl: null,
	comment: file.comment ?? null,
	folderId: null,
	userId: null,
});

/**
 * 固定レスポンスを返すAPIクライアントを作る
 * @param overrides - 上書きするメソッド
 * @returns 基本操作用のAPIクライアント
 */
const makeClient = (overrides: Partial<ActionsClient> = {}): ActionsClient => ({
	driveFoldersCreate: (params) =>
		Promise.resolve(
			makeApiFolder({
				id: 'new1',
				name: params.name ?? '',
				parentId: params.parentId ?? null,
			}),
		),
	driveFoldersUpdate: (params) =>
		Promise.resolve(
			makeApiFolder({ id: params.folderId, name: params.name ?? '', parentId: null }),
		),
	driveFoldersDelete: () => Promise.resolve({}),
	driveFilesUpdate: (params) =>
		Promise.resolve(
			makeApiFile({
				id: params.fileId,
				name: params.name ?? 'x.png',
				comment: params.comment,
				isSensitive: params.isSensitive,
			}),
		),
	driveFilesDelete: () => Promise.resolve({}),
	driveFilesMoveBulk: () => Promise.resolve({}),
	driveFilesUploadFromUrl: () => Promise.resolve({}),
	...overrides,
});

/** テストごとにIndexedDBを初期化する */
const resetDb = async () => {
	await closeDatabase();
	stubIndexedDb();
};

/**
 * 削除メソッドをモック化したクライアントを作る
 * @returns クライアントと削除メソッドのモック
 */
const makeDeleteClient = () => {
	const fileDelete = vi.fn<ActionsClient['driveFilesDelete']>().mockResolvedValue({});
	const folderDelete = vi.fn<ActionsClient['driveFoldersDelete']>().mockResolvedValue({});
	return {
		client: makeClient({ driveFilesDelete: fileDelete, driveFoldersDelete: folderDelete }),
		fileDelete,
		folderDelete,
	};
};

describe('フォルダ作成とリネーム', () => {
	beforeEach(resetDb);

	it('フォルダ作成がAPIを呼びキャッシュへ反映される', async () => {
		const record = await createFolder('a1', makeClient(), { name: '新規', parentId: 'p1' });
		expect(record.name).toBe('新規');
		expect(record.parentKey).toBe('p1');
		const db = await openDatabase();
		await expect(db.get('folders', ['a1', 'new1'])).resolves.toStrictEqual(record);
	});

	it('ファイルのリネームがキャッシュへ反映される', async () => {
		const record = await renameFile('a1', makeClient(), { fileId: 'f1', name: '新名前.png' });
		expect(record.name).toBe('新名前.png');
		const db = await openDatabase();
		await expect(db.get('files', ['a1', 'f1'])).resolves.toStrictEqual(record);
	});

	it('フォルダのリネームがキャッシュへ反映される', async () => {
		const record = await renameFolder('a1', makeClient(), { folderId: 'd1', name: '改名' });
		expect(record.name).toBe('改名');
		const db = await openDatabase();
		await expect(db.get('folders', ['a1', 'd1'])).resolves.toStrictEqual(record);
	});
});

describe('メタデータ更新', () => {
	beforeEach(resetDb);

	it('説明とセンシティブの更新がキャッシュへ反映される', async () => {
		const record = await updateFileMetadata('a1', makeClient(), {
			fileId: 'f1',
			metadata: { comment: '説明', isSensitive: true },
		});
		expect(record.comment).toBe('説明');
		expect(record.isSensitive).toBe(true);
	});
});

describe('削除', () => {
	beforeEach(resetDb);

	it('複数の項目が順番に削除されキャッシュからも消える', async () => {
		const record = await renameFile('a1', makeClient(), { fileId: 'f1', name: 'x.png' });
		expect(record.id).toBe('f1');
		const created = await createFolder('a1', makeClient(), { name: 'd', parentId: null });
		const { client, fileDelete, folderDelete } = makeDeleteClient();

		await deleteItems('a1', client, {
			items: [
				{ kind: 'file', id: 'f1' },
				{ kind: 'folder', id: created.id },
			],
		});

		expect(fileDelete).toHaveBeenCalledWith({ fileId: 'f1' });
		expect(folderDelete).toHaveBeenCalledWith({ folderId: created.id });
		const db = await openDatabase();
		await expect(db.count('files')).resolves.toBe(0);
		await expect(db.count('folders')).resolves.toBe(0);
	});

	it('空でないフォルダの削除エラーは日本語メッセージへ変換される', async () => {
		const apiError = Object.assign(new Error('has child'), {
			code: 'HAS_CHILD_FILES_OR_FOLDERS',
		});
		const client = makeClient({ driveFoldersDelete: () => Promise.reject(apiError) });
		await expect(
			deleteItems('a1', client, { items: [{ kind: 'folder', id: 'd1' }] }),
		).rejects.toThrow('フォルダが空ではないため削除できません');
	});

	it('削除に失敗した時点で後続の削除は行われない', async () => {
		const { client, fileDelete, folderDelete } = makeDeleteClient();
		fileDelete.mockRejectedValue(new Error('失敗'));

		await expect(
			deleteItems('a1', client, {
				items: [
					{ kind: 'file', id: 'f1' },
					{ kind: 'folder', id: 'd1' },
				],
			}),
		).rejects.toThrow('失敗');
		expect(folderDelete).not.toHaveBeenCalled();
	});
});
