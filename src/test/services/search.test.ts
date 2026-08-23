import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { describe, expect, it } from 'vitest';
import { normalizeForSearch, searchDrive } from '../../lib/services/search';

/**
 * テスト用のフォルダを作る
 * @param id - フォルダID
 * @param name - フォルダ名
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (id: string, name: string): FolderRecord => ({
	accountId: 'a1',
	parentKey: '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name,
	parentId: null,
});

/**
 * テスト用のファイルを作る
 * @param id - ファイルID
 * @param name - ファイル名
 * @param comment - コメント
 * @returns ファイルキャッシュレコード
 */
const makeFile = (id: string, name: string, comment: string | null): FileRecord => ({
	accountId: 'a1',
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
	comment,
	folderId: null,
	userId: null,
});

const folders = [makeFolder('d1', '写真'), makeFolder('d2', 'ガゾー置き場')];

const files = [
	makeFile('f1', 'がぞー.png', null),
	makeFile('f2', 'ＳＣＲＥＥＮ.PNG', null),
	makeFile('f3', 'memo.txt', '海で撮った写真'),
];

describe('検索用の正規化', () => {
	it('全角英数は半角に、大文字は小文字に、カタカナはひらがなに揃える', () => {
		expect(normalizeForSearch('ＳＣＲＥＥＮ ガゾー ｶﾞｿﾞｰ')).toBe('screen がぞー がぞー');
	});
});

describe('ドライブの検索', () => {
	it('フォルダ名とファイル名の部分一致で、表記揺れを吸収して一致する', () => {
		const result = searchDrive({ query: 'がぞー', folders, files });
		expect(result.folders.map((folder) => folder.id)).toStrictEqual(['d2']);
		expect(result.files.map((file) => file.id)).toStrictEqual(['f1']);
	});

	it('ファイルはコメントも対象になり、空白区切りの語はすべて含む必要がある', () => {
		expect(
			searchDrive({ query: '写真 海', folders, files }).files.map((file) => file.id),
		).toStrictEqual(['f3']);
		expect(searchDrive({ query: '写真 山', folders, files }).files).toStrictEqual([]);
		expect(
			searchDrive({ query: 'screen', folders, files }).files.map((file) => file.id),
		).toStrictEqual(['f2']);
	});

	it('検索語が空(空白のみ)なら何も一致しない', () => {
		expect(searchDrive({ query: '  ', folders, files })).toStrictEqual({
			folders: [],
			files: [],
		});
	});
});
