import {
	pruneDriveCache,
	putCachedFiles,
	putCachedFolders,
	toFileRecord,
	toFolderRecord,
} from '../db/drive-cache';
import type { AccountRecord } from '../db/schema';
import type { DriveClient } from '../api/client';
import type { entities } from 'misskey-js';
import { putAccount } from '../db/accounts';

const PAGE_LIMIT = 100;

/**
 * ページネーションのカーソルをリクエストパラメータへ変換する
 * @param cursor - 直前ページ末尾のID(先頭ページはnull)
 * @returns untilIdパラメータ(先頭ページは空)
 */
const cursorParams = (cursor: string | null) => (cursor === null ? {} : { untilId: cursor });

/**
 * 指定した親フォルダ直下のフォルダをページネーションで全件取得し、ページごとに通知する
 * @param client - APIクライアント
 * @param parentId - 親フォルダID(ルート直下はnull)
 * @param onPage - 1ページ分のフォルダを受け取る処理
 */
const fetchChildFolders = async (
	client: SyncClient,
	parentId: string | null,
	onPage: (page: entities.DriveFolder[]) => Promise<void>,
) => {
	let cursor: string | null = null;

	while (true) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		const page = await client.driveFolders({
			folderId: parentId,
			limit: PAGE_LIMIT,
			...cursorParams(cursor),
		});
		if (page.length > 0) {
			// oxlint-disable-next-line eslint/no-await-in-loop - 取得したページを逐次キャッシュへ反映する
			await onPage(page);
		}

		const last = page.at(-1);
		if (page.length < PAGE_LIMIT || last === undefined) {
			return;
		}

		cursor = last.id;
	}
};

/**
 * ルートから幅優先で全フォルダを取得し、ページごとに通知する
 * フォルダは親フォルダ指定でしか列挙できないため、ツリーを辿って集める
 * @param client - APIクライアント
 * @param onPage - 1ページ分のフォルダを受け取る処理
 */
const fetchAllFolders = async (
	client: SyncClient,
	onPage: (page: entities.DriveFolder[]) => Promise<void>,
) => {
	const parents: (string | null)[] = [null];

	// for-ofの配列イテレーターは走査中にpushした要素も辿るため、キューとして機能する
	for (const parent of parents) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		await fetchChildFolders(client, parent, async (page) => {
			for (const child of page) {
				parents.push(child.id);
			}

			await onPage(page);
		});
	}
};

/**
 * drive/streamをページネーションして全ファイルを取得し、ページごとに通知する
 * @param client - APIクライアント
 * @param onPage - 1ページ分のファイルを受け取る処理
 */
const fetchAllFiles = async (
	client: SyncClient,
	onPage: (page: entities.DriveFile[]) => Promise<void>,
) => {
	let cursor: string | null = null;

	while (true) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		const page = await client.driveStream({ limit: PAGE_LIMIT, ...cursorParams(cursor) });
		if (page.length > 0) {
			// oxlint-disable-next-line eslint/no-await-in-loop - 取得したページを逐次キャッシュへ反映する
			await onPage(page);
		}

		const last = page.at(-1);
		if (page.length < PAGE_LIMIT || last === undefined) {
			return;
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
 * アカウントのドライブ全体(全フォルダ・全ファイル)を取得し、ローカルキャッシュへ反映する
 * 取得したページごとに逐次保存し(リアルタイム反映)、完了時に見なかったレコードを削除して揃える
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
	const folderIds = new Set<string>();
	const fileIds = new Set<string>();
	/** 現在の件数を進捗として通知する */
	const notify = () => {
		onProgress?.({ folderCount: folderIds.size, fileCount: fileIds.size });
	};

	await fetchAllFolders(client, async (page) => {
		for (const folder of page) {
			folderIds.add(folder.id);
		}

		await putCachedFolders(page.map((folder) => toFolderRecord(account.id, folder)));
		notify();
	});
	await fetchAllFiles(client, async (page) => {
		for (const file of page) {
			fileIds.add(file.id);
		}

		await putCachedFiles(page.map((file) => toFileRecord(account.id, file)));
		notify();
	});

	await pruneDriveCache(account.id, { folderIds, fileIds });
	await putAccount({ ...account, lastSyncedAt: new Date().toISOString() });

	return { folderCount: folderIds.size, fileCount: fileIds.size };
};
