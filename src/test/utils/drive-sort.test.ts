import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { describe, expect, it } from 'vitest';
import { sortFiles, sortFolders, sortMenuItems } from '../../lib/utils/drive-sort';

/**
 * テスト用のフォルダを作る
 * @param id - フォルダID
 * @param name - フォルダ名
 * @param createdAt - 作成日時
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (id: string, name: string, createdAt: string): FolderRecord => ({
	accountId: 'a1',
	parentKey: '',
	id,
	createdAt,
	name,
	parentId: null,
});

/**
 * テスト用のファイルを作る
 * @param file - ファイルのID・名前・サイズ・作成日時
 * @returns ファイルキャッシュレコード
 */
const makeFile = (file: {
	id: string;
	name: string;
	size: number;
	createdAt: string;
}): FileRecord => ({
	accountId: 'a1',
	folderKey: '',
	id: file.id,
	createdAt: file.createdAt,
	name: file.name,
	type: 'image/png',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: file.size,
	isSensitive: false,
	blurhash: null,
	properties: {},
	url: `https://misskey.example/files/${file.id}`,
	thumbnailUrl: null,
	comment: null,
	folderId: null,
	userId: null,
});

describe('ファイルの並び替え', () => {
	const files = [
		makeFile({ id: 'f1', name: 'かきく', size: 300, createdAt: '2026-08-21T00:00:00.000Z' }),
		makeFile({ id: 'f2', name: 'あいう', size: 100, createdAt: '2026-08-23T00:00:00.000Z' }),
		makeFile({ id: 'f3', name: 'さしす', size: 200, createdAt: '2026-08-22T00:00:00.000Z' }),
	];

	it('名前の昇順で日本語順に並ぶ', () => {
		expect(sortFiles(files, 'name', 'asc').map((file) => file.id)).toStrictEqual([
			'f2',
			'f1',
			'f3',
		]);
	});

	it('名前の降順で逆順に並ぶ', () => {
		expect(sortFiles(files, 'name', 'desc').map((file) => file.id)).toStrictEqual([
			'f3',
			'f1',
			'f2',
		]);
	});

	it('サイズの昇順で並ぶ', () => {
		expect(sortFiles(files, 'size', 'asc').map((file) => file.id)).toStrictEqual([
			'f2',
			'f3',
			'f1',
		]);
	});

	it('追加日の降順で並ぶ', () => {
		expect(sortFiles(files, 'createdAt', 'desc').map((file) => file.id)).toStrictEqual([
			'f2',
			'f3',
			'f1',
		]);
	});

	it('元の配列は変更されない', () => {
		sortFiles(files, 'size', 'desc');
		expect(files.map((file) => file.id)).toStrictEqual(['f1', 'f2', 'f3']);
	});
});

describe('フォルダの並び替え', () => {
	const folders = [
		makeFolder('d1', 'かきく', '2026-08-21T00:00:00.000Z'),
		makeFolder('d2', 'あいう', '2026-08-23T00:00:00.000Z'),
	];

	it('名前の昇順で並ぶ', () => {
		expect(sortFolders(folders, 'name', 'asc').map((folder) => folder.id)).toStrictEqual([
			'd2',
			'd1',
		]);
	});

	it('サイズ指定はフォルダにサイズがないため名前順として扱う', () => {
		expect(sortFolders(folders, 'size', 'asc').map((folder) => folder.id)).toStrictEqual([
			'd2',
			'd1',
		]);
	});

	it('追加日の昇順で並ぶ', () => {
		expect(sortFolders(folders, 'createdAt', 'asc').map((folder) => folder.id)).toStrictEqual([
			'd1',
			'd2',
		]);
	});
});

describe('並び替えメニューの項目', () => {
	it('現在の基準にはチェックと方向が付き、他は表示名だけになる', () => {
		expect(sortMenuItems('name', 'asc')).toStrictEqual([
			{ id: 'name', label: '名前(昇順)', checked: true },
			{ id: 'createdAt', label: '追加日', checked: false },
			{ id: 'size', label: 'ファイルサイズ', checked: false },
		]);
	});

	it('降順の時は方向の表示が降順になる', () => {
		const items = sortMenuItems('size', 'desc');
		expect(items.at(-1)).toStrictEqual({
			id: 'size',
			label: 'ファイルサイズ(降順)',
			checked: true,
		});
	});
});
