import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import { driveStore } from '../../lib/stores/drive.svelte';
import { getViewMode } from '../../lib/db/settings';
import { stubIndexedDb } from '../indexeddb-test-util';

/**
 * テスト用のフォルダキャッシュレコードを作る
 * @param id - フォルダID
 * @param name - フォルダ名
 * @param parentId - 親フォルダID
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (id: string, name: string, parentId: string | null): FolderRecord => ({
	accountId: 'a1',
	parentKey: parentId ?? '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name,
	parentId,
});

/**
 * テスト用のファイルキャッシュレコードを作る
 * @param id - ファイルID
 * @param name - ファイル名
 * @param folderId - 所属フォルダID
 * @returns ファイルキャッシュレコード
 */
const makeFile = (id: string, name: string, folderId: string | null): FileRecord => ({
	accountId: 'a1',
	folderKey: folderId ?? '',
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
	folderId,
	userId: null,
});

/** テストごとにIndexedDBを初期化してサンプルデータを投入し、アカウントを開く */
const setupStore = async () => {
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('folders', makeFolder('d1', 'かきく', null));
	await db.put('folders', makeFolder('d2', 'あいう', null));
	await db.put('folders', makeFolder('d3', '子フォルダ', 'd1'));
	await db.put('files', makeFile('f1', 'ルートのファイル.png', null));
	await db.put('files', makeFile('f2', '中のファイル.png', 'd1'));
	await driveStore.openAccount('a1');
};

describe('ドライブの閲覧', () => {
	beforeEach(setupStore);

	it('アカウントを開くとルートの内容が表示される', () => {
		expect(driveStore.accountId).toBe('a1');
		expect(driveStore.currentFolderId).toBeNull();
		expect(driveStore.childFolders.map((folder) => folder.id)).toStrictEqual(['d2', 'd1']);
		expect(driveStore.files.map((file) => file.id)).toStrictEqual(['f1']);
		expect(driveStore.breadcrumb).toStrictEqual([]);
	});

	it('フォルダを開くと中身とパンくずが更新される', async () => {
		await driveStore.openFolder('d1');
		expect(driveStore.childFolders.map((folder) => folder.id)).toStrictEqual(['d3']);
		expect(driveStore.files.map((file) => file.id)).toStrictEqual(['f2']);
		expect(driveStore.breadcrumb.map((folder) => folder.id)).toStrictEqual(['d1']);
	});

	it('childrenMapに全フォルダの階層が入る', () => {
		expect(driveStore.childrenMap['']?.map((folder) => folder.id)).toStrictEqual(['d2', 'd1']);
		expect(driveStore.childrenMap.d1?.map((folder) => folder.id)).toStrictEqual(['d3']);
	});
});

describe('並び替えと表示モード', () => {
	beforeEach(setupStore);

	it('同じ基準を再度指定すると方向が反転する', () => {
		expect(driveStore.sortKey).toBe('name');
		expect(driveStore.sortOrder).toBe('asc');
		driveStore.toggleSort('name');
		expect(driveStore.sortOrder).toBe('desc');
		expect(driveStore.childFolders.map((folder) => folder.id)).toStrictEqual(['d1', 'd2']);
	});

	it('別の基準を指定すると昇順で切り替わる', () => {
		driveStore.toggleSort('createdAt');
		expect(driveStore.sortKey).toBe('createdAt');
		expect(driveStore.sortOrder).toBe('asc');
	});

	it('表示モードの変更は保存され、次にアカウントを開いた時に復元される', async () => {
		await driveStore.changeViewMode('grid');
		expect(driveStore.viewMode).toBe('grid');
		await expect(getViewMode()).resolves.toBe('grid');
		await driveStore.openAccount('a1');
		expect(driveStore.viewMode).toBe('grid');
	});
});

describe('再読み込み', () => {
	beforeEach(setupStore);

	it('表示中フォルダが残っていればそのまま再読み込みされる', async () => {
		await driveStore.openFolder('d1');
		const db = await openDatabase();
		await db.put('files', makeFile('f9', '追加ファイル.png', 'd1'));

		await driveStore.refresh();

		expect(driveStore.currentFolderId).toBe('d1');
		expect(driveStore.files.map((file) => file.id).toSorted()).toStrictEqual(['f2', 'f9']);
	});

	it('表示中フォルダが消えていた場合はルートへ戻る', async () => {
		await driveStore.openFolder('d1');
		const db = await openDatabase();
		await db.delete('folders', ['a1', 'd1']);

		await driveStore.refresh();

		expect(driveStore.currentFolderId).toBeNull();
		expect(driveStore.files.map((file) => file.id)).toStrictEqual(['f1']);
	});
});

describe('エラーの消去', () => {
	beforeEach(setupStore);

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('読み込みに失敗した後、clearErrorでエラーが消える', async () => {
		await closeDatabase();
		vi.stubGlobal('indexedDB', null);
		await driveStore.openAccount('a1');
		expect(driveStore.error).not.toBeNull();
		driveStore.clearError();
		expect(driveStore.error).toBeNull();
	});
});
