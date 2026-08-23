import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import { searchStore } from '../../lib/stores/search.svelte';
import { stubIndexedDb } from '../indexeddb-test-util';

/**
 * テスト用のフォルダを作る
 * @param accountId - アカウントID
 * @param id - フォルダID
 * @param name - フォルダ名
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (accountId: string, id: string, name: string): FolderRecord => ({
	accountId,
	parentKey: '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name,
	parentId: null,
});

/**
 * テスト用のファイルを作る
 * @param accountId - アカウントID
 * @param id - ファイルID
 * @param name - ファイル名
 * @returns ファイルキャッシュレコード
 */
const makeFile = (accountId: string, id: string, name: string): FileRecord => ({
	accountId,
	folderKey: '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name,
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
 * 入力待ち(250ms)を越えて検索が終わるまで待つ
 */
const waitForSearch = async () => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 350);
	});
};

/** テストごとにIndexedDBを初期化し、2アカウント分のデータを入れて検索を消す */
const reset = async () => {
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('folders', makeFolder('a1', 'd1', '写真'));
	await db.put('files', makeFile('a1', 'f1', 'がぞー.png'));
	await db.put('files', makeFile('a1', 'f2', 'memo.txt'));
	await db.put('files', makeFile('a2', 'f3', 'がぞー2.png'));
	searchStore.clear();
	searchStore.setAccount('a1');
};

describe('検索ストア', () => {
	beforeEach(reset);

	it('入力が止まってからアカウントのキャッシュを検索し、結果を保持する', async () => {
		searchStore.setQuery('がぞ');
		expect(searchStore.active).toBe(true);
		expect(searchStore.result).toBeNull();

		await waitForSearch();
		expect(searchStore.result?.files.map((file) => file.id)).toStrictEqual(['f1']);
		expect(searchStore.nameOf({ kind: 'file', id: 'f1' })).toBe('がぞー.png');
	});

	it('検索語を空にすると結果が消え、別アカウントへ切り替えても消える', async () => {
		searchStore.setQuery('写真');
		await waitForSearch();
		expect(searchStore.result?.folders.map((folder) => folder.id)).toStrictEqual(['d1']);

		searchStore.setQuery('');
		expect(searchStore.active).toBe(false);
		expect(searchStore.result).toBeNull();

		searchStore.setQuery('写真');
		searchStore.setAccount('a2');
		expect(searchStore.query).toBe('');
		expect(searchStore.result).toBeNull();
	});

	it('rerunはキャッシュの変更を結果へ反映する', async () => {
		searchStore.setQuery('memo');
		await waitForSearch();
		expect(searchStore.result?.files.map((file) => file.id)).toStrictEqual(['f2']);

		const db = await openDatabase();
		await db.put('files', makeFile('a1', 'f9', 'memo2.txt'));
		searchStore.rerun();
		await waitForSearch();
		expect(searchStore.result?.files.map((file) => file.id)).toStrictEqual(['f2', 'f9']);
	});
});
