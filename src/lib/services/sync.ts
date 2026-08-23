import { replaceDriveCache, toFileRecord, toFolderRecord } from '../db/drive-cache';
import type { AccountRecord } from '../db/schema';
import type { DriveClient } from '../api/client';
import type { entities } from 'misskey-js';
import { putAccount } from '../db/accounts';

/** 1回のリクエストで取得する件数 */
const PAGE_LIMIT = 100;

/**
 * ページネーションのカーソルをリクエストパラメータへ変換する
 * @param cursor - 直前ページ末尾のID(先頭ページはnull)
 * @returns untilIdパラメータ(先頭ページは空)
 */
const cursorParams = (cursor: string | null) => (cursor === null ? {} : { untilId: cursor });

/**
 * 指定した親フォルダ直下のフォルダをページネーションで全件取得する
 * @param client - APIクライアント
 * @param parentId - 親フォルダID(ルート直下はnull)
 * @returns フォルダの配列
 */
const fetchChildFolders = async (client: SyncClient, parentId: string | null) => {
	const result: entities.DriveFolder[] = [];
	let cursor: string | null = null;

	while (true) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		const page = await client.driveFolders({
			folderId: parentId,
			limit: PAGE_LIMIT,
			...cursorParams(cursor),
		});
		result.push(...page);

		const last = page.at(-1);
		if (page.length < PAGE_LIMIT || last === undefined) {
			return result;
		}

		cursor = last.id;
	}
};

/**
 * ルートから幅優先で全フォルダを取得する
 * フォルダは親フォルダ指定でしか列挙できないため、ツリーを辿って集める
 * @param client - APIクライアント
 * @param onCount - 取得済み件数の通知
 * @returns フォルダの配列
 */
const fetchAllFolders = async (client: SyncClient, onCount: (count: number) => void) => {
	const all: entities.DriveFolder[] = [];
	const parents: (string | null)[] = [null];

	// for-ofの配列イテレーターは走査中にpushした要素も辿るため、キューとして機能する
	for (const parent of parents) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		const children = await fetchChildFolders(client, parent);
		all.push(...children);

		for (const child of children) {
			parents.push(child.id);
		}

		onCount(all.length);
	}
	return all;
};

/**
 * drive/streamをページネーションして全ファイルを取得する
 * @param client - APIクライアント
 * @param onCount - 取得済み件数の通知
 * @returns ファイルの配列
 */
const fetchAllFiles = async (client: SyncClient, onCount: (count: number) => void) => {
	const all: entities.DriveFile[] = [];
	let cursor: string | null = null;

	while (true) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		const page = await client.driveStream({ limit: PAGE_LIMIT, ...cursorParams(cursor) });
		all.push(...page);
		onCount(all.length);

		const last = page.at(-1);
		if (page.length < PAGE_LIMIT || last === undefined) {
			return all;
		}

		cursor = last.id;
	}
};

/** 同期に必要なAPI呼び出し */
export type SyncClient = Pick<DriveClient, 'driveFolders' | 'driveStream'>;

/** 同期の進捗 */
export type SyncProgress = {
	/** 取得済みのフォルダ数 */
	folderCount: number;
	/** 取得済みのファイル数 */
	fileCount: number;
};

/** 同期の結果 */
export type SyncResult = {
	/** 取得したフォルダ数 */
	folderCount: number;
	/** 取得したファイル数 */
	fileCount: number;
};

/**
 * アカウントのドライブ全体(全フォルダ・全ファイル)を取得し、ローカルキャッシュを洗い替える
 * 完了時はアカウントの最終同期日時も更新する
 * @param account - 同期するアカウント
 * @param client - APIクライアント
 * @param onProgress - 進捗の通知
 * @returns 同期結果
 */
export const syncDrive = async (
	account: AccountRecord,
	client: SyncClient,
	onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> => {
	let folderCount = 0;
	let fileCount = 0;
	/** 現在の件数を進捗として通知する */
	const notify = () => {
		onProgress?.({ folderCount, fileCount });
	};

	const folders = await fetchAllFolders(client, (count) => {
		folderCount = count;
		notify();
	});
	const files = await fetchAllFiles(client, (count) => {
		fileCount = count;
		notify();
	});

	await replaceDriveCache(
		account.id,
		folders.map((folder) => toFolderRecord(account.id, folder)),
		files.map((file) => toFileRecord(account.id, file)),
	);
	await putAccount({ ...account, lastSyncedAt: new Date().toISOString() });

	return { folderCount: folders.length, fileCount: files.length };
};
