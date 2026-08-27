import { describe, expect, it } from 'vitest';
import type { FileRecord } from '../../lib/db/schema';
import { adjacentFiles } from '../../lib/utils/preview-nav';

/**
 * テスト用のファイルキャッシュレコードを作る
 * @param id - ファイルID
 * @returns ファイルキャッシュレコード
 */
const makeFile = (id: string): FileRecord => ({
	accountId: 'a1',
	folderKey: '',
	id,
	createdAt: '2026-08-23T00:00:00.000Z',
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
	folderId: null,
	userId: null,
});

const files = [makeFile('f1'), makeFile('f2'), makeFile('f3')];

describe('プレビューの隣接ファイル', () => {
	it('中間のファイルは前後の両方が求まる', () => {
		const adjacent = adjacentFiles(files, 'f2');
		expect(adjacent.prev?.id).toBe('f1');
		expect(adjacent.next?.id).toBe('f3');
	});

	it('先頭は前がnull、末尾は次がnullになる', () => {
		expect(adjacentFiles(files, 'f1').prev).toBeNull();
		expect(adjacentFiles(files, 'f1').next?.id).toBe('f2');
		expect(adjacentFiles(files, 'f3').next).toBeNull();
	});

	it('一覧にないファイルは両方nullになる', () => {
		expect(adjacentFiles(files, 'nope')).toStrictEqual({ prev: null, next: null });
	});
});
