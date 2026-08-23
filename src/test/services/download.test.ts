import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import {
	collectDownloadEntries,
	defaultZipName,
	downloadEntries,
} from '../../lib/services/download';
import type { DownloadEntry } from '../../lib/services/download';
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

/**
 * URLをそのまま中身にした成功レスポンスを返す取得関数
 * @param url - 取得するURL
 * @returns レスポンス
 */
const fetchOk = (url: string) => Promise.resolve(new Response(url, { status: 200 }));

/**
 * 保存内容を記録する保存関数を作る
 * @returns 保存関数と記録
 */
const makeSaver = () => {
	const saved: { blob: Blob; name: string }[] = [];
	const save = (blob: Blob, name: string) => {
		saved.push({ blob, name });
	};
	return { save, saved };
};

/** テストごとにIndexedDBを初期化し、写真/海の階層とファイルを入れる */
const reset = async () => {
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('folders', makeFolder('d1', '写真', null));
	await db.put('folders', makeFolder('d2', '海', 'd1'));
	await db.put('files', makeFile('f1', 'root.png', null));
	await db.put('files', makeFile('f2', 'a.png', 'd1'));
	await db.put('files', makeFile('f3', 'b.png', 'd2'));
	await db.put('files', makeFile('f4', 'b.png', 'd2'));
};

describe('ダウンロード対象の収集', () => {
	beforeEach(reset);

	it('フォルダは配下を再帰的に含め、同名ファイルには番号を付けて経路を一意にする', async () => {
		const entries = await collectDownloadEntries('a1', [
			{ kind: 'file', id: 'f1' },
			{ kind: 'folder', id: 'd1' },
		]);
		expect(entries.map((entry) => entry.path)).toStrictEqual([
			'root.png',
			'写真/a.png',
			'写真/海/b.png',
			'写真/海/b (2).png',
		]);
	});

	it('キャッシュにないファイルや存在しないフォルダは含めない', async () => {
		const entries = await collectDownloadEntries('a1', [
			{ kind: 'file', id: '存在しない' },
			{ kind: 'folder', id: '存在しない' },
		]);
		expect(entries).toStrictEqual([]);
	});

	it('既定のzip名は日時から作られる', () => {
		expect(defaultZipName(new Date(2026, 7, 23, 9, 5, 7))).toBe('drive-20260823-090507');
	});
});

describe('ダウンロードの実行', () => {
	it('1件のファイルはそのままの名前で保存される', async () => {
		const { save, saved } = makeSaver();
		const entries: DownloadEntry[] = [
			{ file: makeFile('f1', 'root.png', null), path: 'root.png' },
		];
		await downloadEntries({ entries, zipName: 'unused', fetchImpl: fetchOk, save });
		expect(saved.map((item) => item.name)).toStrictEqual(['root.png']);
		await expect(saved[0]?.blob.text()).resolves.toBe('https://misskey.example/files/f1');
	});

	it('複数件は経路を保ったzipにまとめて保存され、進捗が通知される', async () => {
		const { save, saved } = makeSaver();
		const progress: number[][] = [];
		const entries: DownloadEntry[] = [
			{ file: makeFile('f2', 'a.png', 'd1'), path: '写真/a.png' },
			{ file: makeFile('f3', 'b.png', 'd2'), path: '写真/海/b.png' },
		];
		await downloadEntries({
			entries,
			zipName: '写真',
			fetchImpl: fetchOk,
			save,
			onProgress: (done, total) => {
				progress.push([done, total]);
			},
		});
		expect(saved.map((item) => item.name)).toStrictEqual(['写真.zip']);
		await expect(saved[0]?.blob.text()).resolves.toContain('写真/海/b.png');
		expect(progress).toStrictEqual([
			[0, 2],
			[1, 2],
			[2, 2],
		]);
	});
});

describe('ダウンロードの失敗', () => {
	it('取得に失敗したファイルがあればエラーになる', async () => {
		const { save } = makeSaver();
		const entries: DownloadEntry[] = [
			{ file: makeFile('f1', 'root.png', null), path: 'root.png' },
		];
		await expect(
			downloadEntries({
				entries,
				zipName: 'unused',
				fetchImpl: () => Promise.resolve(new Response(null, { status: 404 })),
				save,
			}),
		).rejects.toThrow('root.pngを取得できませんでした(404)');
	});
});
