import type { ActionsClient, DriveItem } from './drive-actions';
import { moveCachedFiles, moveCachedFolder } from '../db/drive-cache';
import type { FileRecord } from '../db/schema';
import { translateDriveError } from './drive-actions';

/**
 * 選択項目を指定フォルダへ移動する(サーバーとキャッシュの両方)
 * ファイルはmove-bulkでまとめて、フォルダは1件ずつ移動する。移動先自身が対象に含まれる場合は除外する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param input - 移動する項目と移動先フォルダID
 */
export const moveItems = async (
	accountId: string,
	client: ActionsClient,
	input: {
		/** 移動する項目の一覧 */
		items: DriveItem[];
		/** 移動先のフォルダID(ルートはnull) */
		targetFolderId: string | null;
	},
) => {
	const fileIds = input.items.filter((item) => item.kind === 'file').map((item) => item.id);
	const folderIds = input.items
		.filter((item) => item.kind === 'folder')
		.map((item) => item.id)
		.filter((folderId) => folderId !== input.targetFolderId);

	try {
		if (fileIds.length > 0) {
			await client.driveFilesMoveBulk({ fileIds, folderId: input.targetFolderId });
			await moveCachedFiles(accountId, fileIds, input.targetFolderId);
		}

		for (const folderId of folderIds) {
			// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
			await client.driveFoldersUpdate({ folderId, parentId: input.targetFolderId });
			// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
			await moveCachedFolder(accountId, folderId, input.targetFolderId);
		}
	} catch (error) {
		throw translateDriveError(error);
	}
};

/**
 * ファイルのURL取り込みで複製を作る(コピー&ペースト用)
 * サーバー側で非同期に処理されるため、結果は次回の同期で反映される
 * @param client - APIクライアント
 * @param input - 複製するファイルと複製先フォルダID
 */
export const copyFilesToFolder = async (
	client: ActionsClient,
	input: {
		/** 複製するファイルの一覧 */
		files: FileRecord[];
		/** 複製先のフォルダID(ルートはnull) */
		targetFolderId: string | null;
	},
) => {
	try {
		for (const file of input.files) {
			// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
			await client.driveFilesUploadFromUrl({
				url: file.url,
				folderId: input.targetFolderId,
				isSensitive: file.isSensitive,
				comment: file.comment,
			});
		}
	} catch (error) {
		throw translateDriveError(error);
	}
};
