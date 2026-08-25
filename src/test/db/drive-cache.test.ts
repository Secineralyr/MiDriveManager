import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import {
	listAccountFolders,
	listFilesInFolder,
	pruneDriveCache,
	putCachedFiles,
	putCachedFolders,
} from '../../lib/db/drive-cache';
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

describe('ドライブキャッシュの書き込みと整理', () => {
	beforeEach(seedCache);

	it('フォルダをまとめて保存でき、同一キーは上書きされる', async () => {
		await putCachedFolders([makeFolder('a1', 'd1', 'd2'), makeFolder('a1', 'd9', null)]);
		const folders = await listAccountFolders('a1');
		expect(
			folders.map((folder) => `${folder.id}:${folder.parentKey}`).toSorted(),
		).toStrictEqual(['d1:d2', 'd2:d1', 'd9:']);
	});

	it('ファイルをまとめて保存でき、同一キーは上書きされる', async () => {
		await putCachedFiles([makeFile('a1', 'f1', 'd1'), makeFile('a1', 'f9', null)]);
		const inFolder = await listFilesInFolder('a1', 'd1');
		expect(inFolder.map((file) => file.id)).toStrictEqual(['f1', 'f2']);
		const inRoot = await listFilesInFolder('a1', null);
		expect(inRoot.map((file) => file.id)).toStrictEqual(['f9']);
	});

	it('見なかったIDのレコードだけが削除され、他アカウントへは影響しない', async () => {
		await pruneDriveCache('a1', {
			folderIds: new Set<string>(['d1']),
			fileIds: new Set<string>(['f2']),
		});
		const folders = await listAccountFolders('a1');
		expect(folders.map((folder) => folder.id)).toStrictEqual(['d1']);
		const files = await listFilesInFolder('a1', 'd1');
		expect(files.map((file) => file.id)).toStrictEqual(['f2']);
		const otherFolders = await listAccountFolders('a2');
		expect(otherFolders.map((folder) => folder.id)).toStrictEqual(['d3']);
		const otherFiles = await listFilesInFolder('a2', null);
		expect(otherFiles.map((file) => file.id)).toStrictEqual(['f3']);
	});
});
