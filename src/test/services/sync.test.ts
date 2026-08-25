import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import { listAccounts, putAccount } from '../../lib/db/accounts';
import type { AccountRecord } from '../../lib/db/schema';
import type { SyncClient } from '../../lib/services/sync';
import type { entities } from 'misskey-js';
import { stubIndexedDb } from '../indexeddb-test-util';
import { syncDrive } from '../../lib/services/sync';

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
 * テスト用のフォルダエンティティを作る
 * @param id - フォルダID
 * @param parentId - 親フォルダID
 * @returns フォルダ
 */
const makeFolder = (id: string, parentId: string | null): entities.DriveFolder => ({
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name: `フォルダ${id}`,
	parentId,
});

/**
 * テスト用のファイルエンティティを作る
 * @param id - ファイルID
 * @param folderId - 所属フォルダID
 * @returns ファイル
 */
const makeFile = (id: string, folderId: string | null): entities.DriveFile => ({
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
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
	folderId,
	userId: null,
});

/**
 * untilIdページネーションを模倣して1ページ分を返す
 * @param items - 全項目(ID降順である前提)
 * @param untilId - このIDより後の項目から返す
 * @param limit - 1ページの件数
 * @returns 1ページ分の項目
 */
const paginate = <T extends { id: string }>(
	items: T[],
	untilId: string | undefined,
	limit: number,
) => {
	const startIndex =
		untilId === undefined ? 0 : items.findIndex((item) => item.id === untilId) + 1;
	return items.slice(startIndex, startIndex + limit);
};

/**
 * 固定データを返す同期用クライアントを作る
 * @param foldersByParent - 親フォルダIDごとの子フォルダ一覧(ルートはrootキー)
 * @param files - 全ファイル一覧
 * @returns 同期用クライアント
 */
const makeFakeClient = (
	foldersByParent: Record<string, entities.DriveFolder[]>,
	files: entities.DriveFile[],
): SyncClient => ({
	driveFolders: (params) =>
		Promise.resolve(
			paginate(
				foldersByParent[params.folderId ?? 'root'] ?? [],
				params.untilId,
				params.limit ?? 100,
			),
		),
	driveStream: (params) => Promise.resolve(paginate(files, params.untilId, params.limit ?? 100)),
});

/** テストごとにIndexedDBを初期化する */
const resetDb = async () => {
	await closeDatabase();
	stubIndexedDb();
};

describe('ドライブ全量同期', () => {
	beforeEach(resetDb);

	it('フォルダツリーを幅優先で辿って全フォルダと全ファイルをキャッシュする', async () => {
		const client = makeFakeClient(
			{
				root: [makeFolder('fa', null), makeFolder('fb', null)],
				fa: [makeFolder('fc', 'fa')],
			},
			[makeFile('f1', 'fa'), makeFile('f2', null)],
		);

		const result = await syncDrive(makeAccount('a1'), client);

		expect(result).toStrictEqual({ folderCount: 3, fileCount: 2 });
		const db = await openDatabase();
		const folders = await db.getAll('folders');
		expect(
			folders.map((folder) => `${folder.id}:${folder.parentKey}`).toSorted(),
		).toStrictEqual(['fa:', 'fb:', 'fc:fa']);
		const files = await db.getAll('files');
		expect(files.map((file) => `${file.id}:${file.folderKey}`).toSorted()).toStrictEqual([
			'f1:fa',
			'f2:',
		]);
	});

	it('1ページの上限を超えるファイルもページネーションで全件取得する', async () => {
		const files = Array.from({ length: 250 }, (unused, index) =>
			makeFile(`f${1000 - index}`, null),
		);
		const client = makeFakeClient({ root: [] }, files);

		const result = await syncDrive(makeAccount('a1'), client);

		expect(result.fileCount).toBe(250);
		const db = await openDatabase();
		await expect(db.count('files')).resolves.toBe(250);
	});
});

describe('ページごとの逐次反映', () => {
	beforeEach(resetDb);

	it('ファイルはページ取得ごとにキャッシュへ書き込まれる', async () => {
		const files = Array.from({ length: 150 }, (unused, index) =>
			makeFile(`f${1000 - index}`, null),
		);
		const base = makeFakeClient({ root: [] }, files);
		const countsBeforeRequest: number[] = [];
		const client: SyncClient = {
			driveFolders: base.driveFolders,
			driveStream: async (params) => {
				const db = await openDatabase();
				countsBeforeRequest.push(await db.count('files'));
				return base.driveStream(params);
			},
		};

		await syncDrive(makeAccount('a1'), client);

		// 2ページ目のリクエスト時点で1ページ目の100件が保存済みになっている
		expect(countsBeforeRequest).toStrictEqual([0, 100]);
	});

	it('サーバーから消えたフォルダは同期完了時に取り除かれる', async () => {
		const db = await openDatabase();
		await db.put('folders', { ...makeFolder('gone', null), accountId: 'a1', parentKey: '' });
		const client = makeFakeClient({ root: [makeFolder('kept', null)] }, []);

		await syncDrive(makeAccount('a1'), client);

		const folders = await db.getAll('folders');
		expect(folders.map((folder) => folder.id)).toStrictEqual(['kept']);
	});
});

describe('キャッシュの洗い替えと付随情報', () => {
	beforeEach(resetDb);

	it('既存キャッシュは洗い替えられ、他アカウントのキャッシュは残る', async () => {
		const db = await openDatabase();
		await db.put('files', { ...makeFile('stale', null), accountId: 'a1', folderKey: '' });
		await db.put('files', { ...makeFile('other', null), accountId: 'a2', folderKey: '' });
		const client = makeFakeClient({ root: [] }, [makeFile('fresh', null)]);

		await syncDrive(makeAccount('a1'), client);

		const files = await db.getAll('files');
		expect(files.map((file) => file.id).toSorted()).toStrictEqual(['fresh', 'other']);
	});

	it('進捗が通知され、最終値が結果と一致する', async () => {
		const client = makeFakeClient({ root: [makeFolder('fa', null)] }, [makeFile('f1', null)]);
		const progress: { folderCount: number; fileCount: number }[] = [];

		await syncDrive(makeAccount('a1'), client, (value) => {
			progress.push(value);
		});

		expect(progress.length).toBeGreaterThan(0);
		expect(progress.at(-1)).toStrictEqual({ folderCount: 1, fileCount: 1 });
	});

	it('完了時にアカウントの最終同期日時が更新される', async () => {
		const account = makeAccount('a1');
		await putAccount(account);
		const client = makeFakeClient({ root: [] }, []);

		await syncDrive(account, client);

		const [saved] = await listAccounts();
		expect(saved?.lastSyncedAt).not.toBeNull();
	});
});
