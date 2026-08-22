import type { FileRecord, FolderRecord } from './schema';
import { accountKeyRange } from './accounts';
import type { entities } from 'misskey-js';
import { openDatabase } from './database';

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
 * 指定アカウントのドライブキャッシュを渡された内容で洗い替える
 * 削除検出のため、既存キャッシュをすべて消してから入れ直す(他アカウントには影響しない)
 * @param accountId - 対象アカウントのアプリ内ID
 * @param folders - 保存するフォルダキャッシュ
 * @param files - 保存するファイルキャッシュ
 */
export const replaceDriveCache = async (
	accountId: string,
	folders: FolderRecord[],
	files: FileRecord[],
) => {
	const db = await openDatabase();
	const range = accountKeyRange(accountId);
	const tx = db.transaction(['files', 'folders'], 'readwrite');
	const filesStore = tx.objectStore('files');
	const foldersStore = tx.objectStore('folders');

	await Promise.all([filesStore.delete(range), foldersStore.delete(range)]);
	await Promise.all([
		...folders.map((folder) => foldersStore.put(folder)),
		...files.map((file) => filesStore.put(file)),
		tx.done,
	]);
};
