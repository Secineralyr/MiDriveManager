import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import { listAccountFolders, listFilesInFolder } from '../../lib/db/drive-cache';
import { stubIndexedDb } from '../indexeddb-test-util';

/**
 * テスト用のフォルダキャッシュレコードを作る
 * @param accountId - アプリ内アカウントID
 * @param id - フォルダID
 * @param parentId - 親フォルダID
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (accountId: string, id: string, parentId: string | null): FolderRecord => ({
	accountId,
	parentKey: parentId ?? '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name: `フォルダ${id}`,
	parentId,
});

/**
 * テスト用のファイルキャッシュレコードを作る
 * @param accountId - アプリ内アカウントID
 * @param id - ファイルID
 * @param folderId - 所属フォルダID
 * @returns ファイルキャッシュレコード
 */
const makeFile = (accountId: string, id: string, folderId: string | null): FileRecord => ({
	accountId,
	folderKey: folderId ?? '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
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

/** テストごとにIndexedDBを初期化してサンプルデータを投入する */
const seedCache = async () => {
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('folders', makeFolder('a1', 'd1', null));
	await db.put('folders', makeFolder('a1', 'd2', 'd1'));
	await db.put('folders', makeFolder('a2', 'd3', null));
	await db.put('files', makeFile('a1', 'f1', null));
	await db.put('files', makeFile('a1', 'f2', 'd1'));
	await db.put('files', makeFile('a2', 'f3', null));
};

describe('ドライブキャッシュの読み取り', () => {
	beforeEach(seedCache);

	it('アカウントの全フォルダだけが取得される', async () => {
		const folders = await listAccountFolders('a1');
		expect(folders.map((folder) => folder.id).toSorted()).toStrictEqual(['d1', 'd2']);
	});

	it('ルート直下のファイルだけが取得される', async () => {
		const files = await listFilesInFolder('a1', null);
		expect(files.map((file) => file.id)).toStrictEqual(['f1']);
	});

	it('指定フォルダ直下のファイルだけが取得される', async () => {
		const files = await listFilesInFolder('a1', 'd1');
		expect(files.map((file) => file.id)).toStrictEqual(['f2']);
	});

	it('別アカウントのキャッシュは混ざらない', async () => {
		const folders = await listAccountFolders('a2');
		expect(folders.map((folder) => folder.id)).toStrictEqual(['d3']);
		const files = await listFilesInFolder('a2', null);
		expect(files.map((file) => file.id)).toStrictEqual(['f3']);
	});
});
