import type { FileRecord, FolderRecord } from '../../lib/db/schema';
import { describe, expect, it } from 'vitest';
import {
	detailTargetItem,
	detailTargetName,
	resolveDetailTarget,
} from '../../lib/services/detail-target';

/** テスト用のフォルダ */
const folder: FolderRecord = {
	accountId: 'a1',
	parentKey: '',
	id: 'd1',
	createdAt: '2026-08-21T00:00:00.000Z',
	name: '写真',
	parentId: null,
};

/** テスト用のファイル */
const file: FileRecord = {
	accountId: 'a1',
	folderKey: '',
	id: 'f1',
	createdAt: '2026-08-21T00:00:00.000Z',
	name: 'がぞー.jpg',
	type: 'image/jpeg',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: 100,
	isSensitive: false,
	blurhash: null,
	properties: {},
	url: 'https://misskey.example/files/f1',
	thumbnailUrl: null,
	comment: null,
	folderId: null,
	userId: null,
};

describe('詳細パネルの表示対象の解決', () => {
	it('最後に選択したフォルダが対象になる', () => {
		const target = resolveDetailTarget({
			last: { kind: 'folder', id: 'd1' },
			folders: [folder],
			files: [file],
		});
		expect(target).toStrictEqual({ kind: 'folder', folder });
		expect(detailTargetName(target)).toBe('写真');
		expect(detailTargetItem(target)).toStrictEqual({ kind: 'folder', id: 'd1' });
	});

	it('最後に選択したファイルが対象になる', () => {
		const target = resolveDetailTarget({
			last: { kind: 'file', id: 'f1' },
			folders: [folder],
			files: [file],
		});
		expect(target).toStrictEqual({ kind: 'file', file });
		expect(detailTargetName(target)).toBe('がぞー.jpg');
		expect(detailTargetItem(target)).toStrictEqual({ kind: 'file', id: 'f1' });
	});

	it('選択がないか一覧に存在しない場合はnullになり、名前は空になる', () => {
		expect(resolveDetailTarget({ last: null, folders: [folder], files: [file] })).toBeNull();
		expect(
			resolveDetailTarget({
				last: { kind: 'file', id: '存在しない' },
				folders: [],
				files: [file],
			}),
		).toBeNull();
		expect(detailTargetName(null)).toBe('');
		expect(detailTargetItem(null)).toBeNull();
	});
});
