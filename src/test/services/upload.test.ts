import type { DropEntry, UploadClient } from '../../lib/services/upload';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import {
	collectUploadEntries,
	filesToUploadEntries,
	uploadEntries,
} from '../../lib/services/upload';
import type { FolderRecord } from '../../lib/db/schema';
import type { entities } from 'misskey-js';
import { stubIndexedDb } from '../indexeddb-test-util';

/**
 * テスト用のFileを作る
 * @param name - ファイル名
 * @returns File
 */
const makeFile = (name: string) => new File(['data'], name, { type: 'image/png' });

/**
 * ドロップされたファイル項目の偽物を作る
 * @param file - 中身のFile
 * @returns ドロップされた項目
 */
const fileEntry = (file: File): DropEntry => ({
	isFile: true,
	isDirectory: false,
	name: file.name,
	file: (success) => {
		success(file);
	},
});

/**
 * ドロップされたフォルダ項目の偽物を作る(子項目は1件ずつ小分けに返し、最後に空を返す)
 * @param name - フォルダ名
 * @param children - 子項目
 * @returns ドロップされた項目
 */
const directoryEntry = (name: string, children: DropEntry[]): DropEntry => ({
	isFile: false,
	isDirectory: true,
	name,
	createReader: () => {
		const remaining = [...children];
		return {
			readEntries: (success) => {
				success(remaining.splice(0, 1));
			},
		};
	},
});

/**
 * APIレスポンス用のファイルを作る
 * @param id - ファイルID
 * @param folderId - 所属フォルダID
 * @returns ファイル
 */
const makeApiFile = (id: string, folderId: string | null): entities.DriveFile => ({
	id,
	createdAt: '2026-08-23T00:00:00.000Z',
	name: `${id}.png`,
	type: 'image/png',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: 4,
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
 * テスト用のフォルダキャッシュレコードを作る
 * @param id - フォルダID
 * @param name - フォルダ名
 * @returns フォルダキャッシュレコード
 */
const makeFolderRecord = (id: string, name: string): FolderRecord => ({
	accountId: 'a1',
	parentKey: '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name,
	parentId: null,
});

/**
 * アップロード用クライアントのモックを作る(作成したファイルのIDは連番)
 * @returns クライアントとモック
 */
const makeClient = () => {
	let fileSeq = 0;
	let folderSeq = 0;
	const filesCreate = vi.fn<UploadClient['driveFilesCreate']>().mockImplementation((params) => {
		fileSeq += 1;
		return Promise.resolve(makeApiFile(`new${fileSeq}`, params.folderId ?? null));
	});
	const foldersCreate = vi
		.fn<UploadClient['driveFoldersCreate']>()
		.mockImplementation((params) => {
			folderSeq += 1;
			return Promise.resolve({
				id: `dir${folderSeq}`,
				createdAt: '2026-08-23T00:00:00.000Z',
				name: params.name ?? '',
				parentId: params.parentId ?? null,
			});
		});
	const client: UploadClient = {
		driveFilesCreate: filesCreate,
		driveFoldersCreate: foldersCreate,
	};
	return { client, filesCreate, foldersCreate };
};

/** テストごとにIndexedDBを初期化し、ルート直下に「写真」フォルダを置く */
const reset = async () => {
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('folders', makeFolderRecord('d1', '写真'));
};

describe('ドロップ項目の展開', () => {
	it('フォルダは再帰的に辿り、相対経路付きのアップロード対象になる', async () => {
		const sea = directoryEntry('海', [fileEntry(makeFile('b.png'))]);
		const trip = directoryEntry('旅行', [fileEntry(makeFile('a.png')), sea]);
		const entries = await collectUploadEntries([fileEntry(makeFile('root.png')), trip]);
		expect(entries.map((entry) => [entry.file.name, entry.path])).toStrictEqual([
			['root.png', []],
			['a.png', ['旅行']],
			['b.png', ['旅行', '海']],
		]);
	});

	it('Fileの一覧は経路なしのアップロード対象になる', () => {
		const file = makeFile('x.png');
		expect(filesToUploadEntries([file])).toStrictEqual([{ file, path: [] }]);
	});
});

describe('アップロードの実行', () => {
	beforeEach(reset);

	it('経路のフォルダは同名の既存を再利用し、なければ一度だけ作成する', async () => {
		const { client, filesCreate, foldersCreate } = makeClient();
		await uploadEntries('a1', client, {
			entries: [
				{ file: makeFile('a.png'), path: ['写真'] },
				{ file: makeFile('b.png'), path: ['写真', '海'] },
				{ file: makeFile('c.png'), path: ['写真', '海'] },
			],
			targetFolderId: null,
		});
		expect(foldersCreate).toHaveBeenCalledWith({ name: '海', parentId: 'd1' });
		// 作成は1回だけ(2件目以降は作成済みのdir1を再利用している)
		expect(filesCreate.mock.calls.map(([params]) => params.folderId)).toStrictEqual([
			'd1',
			'dir1',
			'dir1',
		]);
	});

	it('作成したファイルとフォルダはキャッシュへ入り、進捗が通知される', async () => {
		const { client } = makeClient();
		const progress: number[][] = [];
		await uploadEntries('a1', client, {
			entries: [{ file: makeFile('a.png'), path: ['新規'] }],
			targetFolderId: null,
			onProgress: (done, total) => {
				progress.push([done, total]);
			},
		});
		const db = await openDatabase();
		await expect(db.get('files', ['a1', 'new1'])).resolves.toMatchObject({ folderId: 'dir1' });
		await expect(db.get('folders', ['a1', 'dir1'])).resolves.toMatchObject({ name: '新規' });
		expect(progress).toStrictEqual([
			[0, 1],
			[1, 1],
		]);
	});
});

describe('アップロードの既存検出とエラー', () => {
	beforeEach(reset);

	it('キャッシュに既にあるIDが返された場合は既存として通知する', async () => {
		const { client, filesCreate } = makeClient();
		filesCreate.mockResolvedValue(makeApiFile('new1', 'd1'));
		const db = await openDatabase();
		await db.put('files', { ...makeApiFile('new1', 'd1'), accountId: 'a1', folderKey: 'd1' });
		const existing: string[] = [];
		await uploadEntries('a1', client, {
			entries: [{ file: makeFile('dup.png'), path: [] }],
			targetFolderId: null,
			onExisting: (file) => {
				existing.push(file.id);
			},
		});
		expect(existing).toStrictEqual(['new1']);
	});

	it('APIのエラーは日本語メッセージへ変換される', async () => {
		const { client, filesCreate } = makeClient();
		filesCreate.mockRejectedValue(
			Object.assign(new Error('no space'), { code: 'NO_FREE_SPACE' }),
		);
		await expect(
			uploadEntries('a1', client, {
				entries: [{ file: makeFile('a.png'), path: [] }],
				targetFolderId: null,
			}),
		).rejects.toThrow('ドライブの空き容量が不足しています');
	});
});
