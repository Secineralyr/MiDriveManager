import type { AccountRecord, FileRecord, FolderRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import { deleteAccount, listAccounts, putAccount } from '../../lib/db/accounts';
import { stubIndexedDb } from '../indexeddb-test-util';

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
 * テスト用のファイルキャッシュレコードを作る
 * @param accountId - アプリ内アカウントID
 * @param fileId - ファイルID
 * @returns ファイルキャッシュレコード
 */
const makeFile = (accountId: string, fileId: string): FileRecord => ({
	accountId,
	folderKey: '',
	id: fileId,
	createdAt: '2026-08-21T00:00:00.000Z',
	name: `${fileId}.png`,
	type: 'image/png',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: 100,
	isSensitive: false,
	blurhash: null,
	properties: {},
	url: `https://misskey.example/files/${fileId}`,
	thumbnailUrl: null,
	comment: null,
	folderId: null,
	userId: null,
});

/**
 * テスト用のフォルダキャッシュレコードを作る
 * @param accountId - アプリ内アカウントID
 * @param folderId - フォルダID
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (accountId: string, folderId: string): FolderRecord => ({
	accountId,
	parentKey: '',
	id: folderId,
	createdAt: '2026-08-21T00:00:00.000Z',
	name: `フォルダ${folderId}`,
	parentId: null,
});

/** テストごとにIndexedDBを初期化する */
const resetDb = async () => {
	await closeDatabase();
	stubIndexedDb();
};

/**
 * 2アカウントと、それぞれのファイル・フォルダキャッシュを投入する
 * @returns データベース接続
 */
const seedAccountsWithCache = async () => {
	const db = await openDatabase();
	await putAccount(makeAccount('a1'));
	await putAccount(makeAccount('a2'));
	await db.put('files', makeFile('a1', 'f1'));
	await db.put('files', makeFile('a2', 'f2'));
	await db.put('folders', makeFolder('a1', 'd1'));
	await db.put('folders', makeFolder('a2', 'd2'));
	return db;
};

describe('アカウントの保存と一覧', () => {
	beforeEach(resetDb);

	it('保存したアカウントを一覧で取得できる', async () => {
		await putAccount(makeAccount('a1'));
		await putAccount(makeAccount('a2'));
		const accounts = await listAccounts();
		expect(accounts.map((account) => account.id).toSorted()).toStrictEqual(['a1', 'a2']);
	});

	it('同じIDのアカウントは上書きされる', async () => {
		await putAccount(makeAccount('a1'));
		await putAccount({ ...makeAccount('a1'), name: '新しい名前' });
		const accounts = await listAccounts();
		expect(accounts).toHaveLength(1);
		expect(accounts[0]?.name).toBe('新しい名前');
	});
});

describe('アカウントの削除', () => {
	beforeEach(resetDb);

	it('アカウントと、そのアカウントのキャッシュだけが削除される', async () => {
		const db = await seedAccountsWithCache();

		await deleteAccount('a1');

		const accounts = await listAccounts();
		expect(accounts.map((account) => account.id)).toStrictEqual(['a2']);
		const files = await db.getAll('files');
		expect(files.map((file) => file.id)).toStrictEqual(['f2']);
		const folders = await db.getAll('folders');
		expect(folders.map((folder) => folder.id)).toStrictEqual(['d2']);
	});
});
