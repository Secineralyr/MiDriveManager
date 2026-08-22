import { buildChildrenMap, folderPath } from '../../lib/services/folder-tree';
import { describe, expect, it } from 'vitest';
import type { FolderRecord } from '../../lib/db/schema';

/**
 * テスト用のフォルダを作る
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

describe('子フォルダ一覧の構築', () => {
	it('親キーごとにグループ化され、各一覧は名前順に並ぶ', () => {
		const map = buildChildrenMap([
			makeFolder('f1', 'かきく', null),
			makeFolder('f2', 'あいう', null),
			makeFolder('f3', '子フォルダ', 'f1'),
		]);
		expect(map['']?.map((folder) => folder.id)).toStrictEqual(['f2', 'f1']);
		expect(map.f1?.map((folder) => folder.id)).toStrictEqual(['f3']);
	});

	it('フォルダがなければ空のオブジェクトになる', () => {
		expect(buildChildrenMap([])).toStrictEqual({});
	});
});

describe('フォルダ経路の構築', () => {
	const folders = [
		makeFolder('f1', '親', null),
		makeFolder('f2', '子', 'f1'),
		makeFolder('f3', '孫', 'f2'),
	];

	it('ルートから対象フォルダまでの経路を返す', () => {
		expect(folderPath(folders, 'f3').map((folder) => folder.id)).toStrictEqual([
			'f1',
			'f2',
			'f3',
		]);
	});

	it('ルート指定(null)では空の経路を返す', () => {
		expect(folderPath(folders, null)).toStrictEqual([]);
	});

	it('存在しないフォルダ指定では空の経路を返す', () => {
		expect(folderPath(folders, '存在しない')).toStrictEqual([]);
	});

	it('親が循環していても無限ループせず辿れた範囲を返す', () => {
		const cyclic = [makeFolder('a', 'A', 'b'), makeFolder('b', 'B', 'a')];
		const path = folderPath(cyclic, 'a');
		expect(path.map((folder) => folder.id)).toStrictEqual(['b', 'a']);
	});
});
