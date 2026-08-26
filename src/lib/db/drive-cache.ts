import type { DriveManagerSchema, FileRecord, FolderRecord } from './schema';
import type { IDBPObjectStore } from 'idb';
import { accountKeyRange } from './accounts';
import type { entities } from 'misskey-js';
import { openDatabase } from './database';

/**
 * ストア内で残すIDに含まれないレコードの削除を予約する(pruneDriveCacheの下請け)
 * @param store - 対象のストア(files/foldersのトランザクション内ストア)
 * @param range - 対象アカウントのキー範囲
 * @param keepIds - 残すIDの集合
 * @returns 削除リクエストのPromiseの配列
 */
const pruneStore = async <Name extends 'files' | 'folders'>(
	store: IDBPObjectStore<DriveManagerSchema, ('files' | 'folders')[], Name, 'readwrite'>,
	range: IDBKeyRange,
	keepIds: Set<string>,
) => {
	const pending: Promise<void>[] = [];
	for await (const cursor of store.iterate(range)) {
		if (!keepIds.has(cursor.value.id)) {
			pending.push(cursor.delete());
		}
	}

	return pending;
};

/**
 * MisskeyのDriveFileをキャッシュレコードへ変換する
 * @param accountId - 所属するアカウントのアプリ内ID
 * @param file - 変換するファイル
 * @returns ファイルキャッシュレコード
 */
export const toFileRecord = (accountId: string, file: entities.DriveFile): FileRecord => ({
	...file,
	accountId,
	folderKey: file.folderId ?? '',
});

/**
 * MisskeyのDriveFolderをキャッシュレコードへ変換する
 * @param accountId - 所属するアカウントのアプリ内ID
 * @param folder - 変換するフォルダ
 * @returns フォルダキャッシュレコード
 */
export const toFolderRecord = (accountId: string, folder: entities.DriveFolder): FolderRecord => ({
	...folder,
	accountId,
	parentKey: folder.parentId ?? '',
});

/**
 * 指定アカウントの全フォルダキャッシュを取得する
 * @param accountId - 対象アカウントのアプリ内ID
 * @returns フォルダキャッシュの配列
 */
export const listAccountFolders = async (accountId: string) => {
	const db = await openDatabase();
	return db.getAll('folders', accountKeyRange(accountId));
};

/**
 * 指定アカウントの全ファイルキャッシュを取得する(検索用)
 * @param accountId - 対象アカウントのアプリ内ID
 * @returns ファイルキャッシュの配列
 */
export const listAccountFiles = async (accountId: string) => {
	const db = await openDatabase();
	return db.getAll('files', accountKeyRange(accountId));
};

/**
 * 指定フォルダ直下のファイルキャッシュを取得する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param folderId - フォルダID(ルート直下はnull)
 * @returns ファイルキャッシュの配列
 */
export const listFilesInFolder = async (accountId: string, folderId: string | null) => {
	const db = await openDatabase();
	return db.getAllFromIndex('files', 'byFolder', [accountId, folderId ?? '']);
};

/**
 * ファイルキャッシュを1件保存する(同一キーは上書き)
 * @param record - 保存するファイルキャッシュ
 */
export const putCachedFile = async (record: FileRecord) => {
	const db = await openDatabase();
	await db.put('files', record);
};

/**
 * フォルダキャッシュを1件保存する(同一キーは上書き)
 * @param record - 保存するフォルダキャッシュ
 */
export const putCachedFolder = async (record: FolderRecord) => {
	const db = await openDatabase();
	await db.put('folders', record);
};

/**
 * ファイルキャッシュを1件取得する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param fileId - 取得するファイルID
 * @returns ファイルキャッシュ。存在しなければundefined
 */
export const getCachedFile = async (accountId: string, fileId: string) => {
	const db = await openDatabase();
	return db.get('files', [accountId, fileId]);
};

/**
 * フォルダキャッシュを1件取得する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param folderId - 取得するフォルダID
 * @returns フォルダキャッシュ。存在しなければundefined
 */
export const getCachedFolder = async (accountId: string, folderId: string) => {
	const db = await openDatabase();
	return db.get('folders', [accountId, folderId]);
};

/**
 * キャッシュ上で複数のファイルを別フォルダへ移動する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param fileIds - 移動するファイルIDの一覧
 * @param folderId - 移動先のフォルダID(ルートはnull)
 */
export const moveCachedFiles = async (
	accountId: string,
	fileIds: string[],
	folderId: string | null,
) => {
	const db = await openDatabase();
	const tx = db.transaction('files', 'readwrite');
	const records = await Promise.all(fileIds.map((fileId) => tx.store.get([accountId, fileId])));
	const updates = records
		.filter((record) => record !== undefined)
		.map((record) => tx.store.put({ ...record, folderId, folderKey: folderId ?? '' }));

	await Promise.all([...updates, tx.done]);
};

/**
 * キャッシュ上でフォルダを別の親フォルダへ移動する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param folderId - 移動するフォルダID
 * @param parentId - 移動先の親フォルダID(ルートはnull)
 */
export const moveCachedFolder = async (
	accountId: string,
	folderId: string,
	parentId: string | null,
) => {
	const db = await openDatabase();
	const record = await db.get('folders', [accountId, folderId]);
	if (record === undefined) {
		return;
	}

	await db.put('folders', { ...record, parentId, parentKey: parentId ?? '' });
};

/**
 * ファイルキャッシュを1件削除する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param fileId - 削除するファイルID
 */
export const deleteCachedFile = async (accountId: string, fileId: string) => {
	const db = await openDatabase();
	await db.delete('files', [accountId, fileId]);
};

/**
 * フォルダキャッシュを1件削除する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param folderId - 削除するフォルダID
 */
export const deleteCachedFolder = async (accountId: string, folderId: string) => {
	const db = await openDatabase();
	await db.delete('folders', [accountId, folderId]);
};

/**
 * フォルダキャッシュをまとめて保存する(同一キーは上書き)
 * @param records - 保存するフォルダキャッシュ
 */
export const putCachedFolders = async (records: FolderRecord[]) => {
	const db = await openDatabase();
	const tx = db.transaction('folders', 'readwrite');
	await Promise.all([...records.map((record) => tx.store.put(record)), tx.done]);
};

/**
 * ファイルキャッシュをまとめて保存する(同一キーは上書き)
 * @param records - 保存するファイルキャッシュ
 */
export const putCachedFiles = async (records: FileRecord[]) => {
	const db = await openDatabase();
	const tx = db.transaction('files', 'readwrite');
	await Promise.all([...records.map((record) => tx.store.put(record)), tx.done]);
};

/**
 * 同期で見なかったレコードを削除して、指定アカウントのキャッシュを取得結果へ揃える
 * (同期はページごとに逐次保存するため、サーバー側で削除された項目は完了時にここで取り除く。
 * 他アカウントには影響しない)
 * @param accountId - 対象アカウントのアプリ内ID
 * @param keep - 残すID(同期で見たID)の集合
 */
export const pruneDriveCache = async (
	accountId: string,
	keep: {
		/** 残すフォルダIDの集合 */
		folderIds: Set<string>;
		/** 残すファイルIDの集合 */
		fileIds: Set<string>;
	},
) => {
	const db = await openDatabase();
	const range = accountKeyRange(accountId);
	const tx = db.transaction(['files', 'folders'], 'readwrite');

	const fileDeletes = await pruneStore(tx.objectStore('files'), range, keep.fileIds);
	const folderDeletes = await pruneStore(tx.objectStore('folders'), range, keep.folderIds);

	await Promise.all([...fileDeletes, ...folderDeletes, tx.done]);
};
