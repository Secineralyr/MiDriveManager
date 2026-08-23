/* oxlint-disable eslint/no-await-in-loop -- 一括削除はレート制御のため逐次実行が要件 */

import {
	deleteCachedFile,
	deleteCachedFolder,
	putCachedFile,
	putCachedFolder,
	toFileRecord,
	toFolderRecord,
} from '../db/drive-cache';
import type { DriveClient } from '../api/client';

/** 基本操作に必要なAPI呼び出し */
type ActionsClientShape = Pick<
	DriveClient,
	| 'driveFoldersCreate'
	| 'driveFoldersUpdate'
	| 'driveFoldersDelete'
	| 'driveFilesUpdate'
	| 'driveFilesDelete'
>;

/** 削除対象の項目 */
type DriveItemShape = {
	/** 項目の種別 */
	kind: 'file' | 'folder';
	/** 項目のID */
	id: string;
};

/** ファイルのメタデータ編集の内容 */
type FileMetadataShape = {
	/** コメント(代替テキスト)。nullで未設定 */
	comment: string | null;
	/** センシティブフラグ */
	isSensitive: boolean;
};

/**
 * Misskey APIのエラーをアプリ向けのメッセージへ変換する
 * @param error - 発生したエラー
 * @returns 変換後のエラー
 */
const translateDriveError = (error: unknown) => {
	if (typeof error === 'object' && error !== null && 'code' in error) {
		if (error.code === 'HAS_CHILD_FILES_OR_FOLDERS') {
			return new Error('フォルダが空ではないため削除できません');
		}
		if (error.code === 'NO_SUCH_FILE' || error.code === 'NO_SUCH_FOLDER') {
			return new Error('対象が見つかりません。同期し直してください');
		}
	}
	return error instanceof Error ? error : new Error('操作に失敗しました');
};

/**
 * 1件の項目を削除する(サーバーとキャッシュの両方)
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param item - 削除する項目
 */
const deleteItem = async (accountId: string, client: ActionsClientShape, item: DriveItemShape) => {
	if (item.kind === 'file') {
		await client.driveFilesDelete({ fileId: item.id });
		await deleteCachedFile(accountId, item.id);
		return;
	}
	await client.driveFoldersDelete({ folderId: item.id });
	await deleteCachedFolder(accountId, item.id);
};

/** 基本操作に必要なAPI呼び出し */
export type ActionsClient = ActionsClientShape;

/** 削除対象の項目 */
export type DriveItem = DriveItemShape;

/** ファイルのメタデータ編集の内容 */
export type FileMetadata = FileMetadataShape;

/**
 * フォルダを作成してキャッシュへ反映する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param input - 作成するフォルダの名前と親フォルダID
 * @returns 作成されたフォルダのキャッシュレコード
 */
export const createFolder = async (
	accountId: string,
	client: ActionsClient,
	input: {
		/** フォルダ名 */
		name: string;
		/** 親フォルダID(ルート直下はnull) */
		parentId: string | null;
	},
) => {
	try {
		const folder = await client.driveFoldersCreate({
			name: input.name,
			parentId: input.parentId,
		});
		const record = toFolderRecord(accountId, folder);
		await putCachedFolder(record);
		return record;
	} catch (error) {
		throw translateDriveError(error);
	}
};

/**
 * ファイルの名前を変更してキャッシュへ反映する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param input - 対象のファイルIDと新しい名前
 * @returns 更新後のファイルのキャッシュレコード
 */
export const renameFile = async (
	accountId: string,
	client: ActionsClient,
	input: {
		/** 対象のファイルID */
		fileId: string;
		/** 新しい名前 */
		name: string;
	},
) => {
	try {
		const file = await client.driveFilesUpdate({ fileId: input.fileId, name: input.name });
		const record = toFileRecord(accountId, file);
		await putCachedFile(record);
		return record;
	} catch (error) {
		throw translateDriveError(error);
	}
};

/**
 * フォルダの名前を変更してキャッシュへ反映する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param input - 対象のフォルダIDと新しい名前
 * @returns 更新後のフォルダのキャッシュレコード
 */
export const renameFolder = async (
	accountId: string,
	client: ActionsClient,
	input: {
		/** 対象のフォルダID */
		folderId: string;
		/** 新しい名前 */
		name: string;
	},
) => {
	try {
		const folder = await client.driveFoldersUpdate({
			folderId: input.folderId,
			name: input.name,
		});
		const record = toFolderRecord(accountId, folder);
		await putCachedFolder(record);
		return record;
	} catch (error) {
		throw translateDriveError(error);
	}
};

/**
 * ファイルのメタデータ(コメント・センシティブ)を更新してキャッシュへ反映する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param input - 対象のファイルIDと更新するメタデータ
 * @returns 更新後のファイルのキャッシュレコード
 */
export const updateFileMetadata = async (
	accountId: string,
	client: ActionsClient,
	input: {
		/** 対象のファイルID */
		fileId: string;
		/** 更新するメタデータ */
		metadata: FileMetadata;
	},
) => {
	try {
		const file = await client.driveFilesUpdate({
			fileId: input.fileId,
			comment: input.metadata.comment,
			isSensitive: input.metadata.isSensitive,
		});
		const record = toFileRecord(accountId, file);
		await putCachedFile(record);
		return record;
	} catch (error) {
		throw translateDriveError(error);
	}
};

/**
 * 複数の項目を順番に削除する(サーバーとキャッシュの両方)
 * レートリミットを考慮して1件ずつ実行し、失敗した時点で中断する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param items - 削除する項目の一覧
 */
export const deleteItems = async (accountId: string, client: ActionsClient, items: DriveItem[]) => {
	for (const item of items) {
		try {
			await deleteItem(accountId, client, item);
		} catch (error) {
			throw translateDriveError(error);
		}
	}
};
