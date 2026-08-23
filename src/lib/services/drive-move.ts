import type { ActionsClient, DriveItem } from './drive-actions';
import { moveCachedFiles, moveCachedFolder } from '../db/drive-cache';
import type { FileRecord } from '../db/schema';
import { translateDriveError } from './drive-actions';

/** 進捗通知(完了件数, 全件数) */
type ProgressCallback = (done: number, total: number) => void;

/** 移動の実行計画 */
type MovePlan = {
	/** まとめて移動するファイルID */
	fileIds: string[];
	/** 1件ずつ移動するフォルダID(移動先自身は除く) */
	folderIds: string[];
	/** 移動先のフォルダID(ルートはnull) */
	targetFolderId: string | null;
	/** 進捗通知。ファイルはまとめて1件分、フォルダは1件ずつ数える */
	onProgress?: ProgressCallback;
};

/**
 * 移動対象をファイルとフォルダに分けて実行計画を作る
 * @param input - 移動する項目と移動先フォルダID
 * @returns 移動の実行計画
 */
const planMove = (input: {
	/** 移動する項目の一覧 */
	items: DriveItem[];
	/** 移動先のフォルダID(ルートはnull) */
	targetFolderId: string | null;
	/** 進捗通知 */
	onProgress?: ProgressCallback;
}): MovePlan => ({
	fileIds: input.items.filter((item) => item.kind === 'file').map((item) => item.id),
	folderIds: input.items
		.filter((item) => item.kind === 'folder')
		.map((item) => item.id)
		.filter((folderId) => folderId !== input.targetFolderId),
	targetFolderId: input.targetFolderId,
	onProgress: input.onProgress,
});

/**
 * 計画の全件数(ファイルはまとめて1件分)を返す
 * @param plan - 移動の実行計画
 * @returns 全件数
 */
const planTotal = (plan: MovePlan) => (plan.fileIds.length > 0 ? 1 : 0) + plan.folderIds.length;

/**
 * ファイルをまとめて移動し、キャッシュを更新する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param plan - 移動の実行計画
 */
const moveFilesBulk = async (accountId: string, client: ActionsClient, plan: MovePlan) => {
	await client.driveFilesMoveBulk({ fileIds: plan.fileIds, folderId: plan.targetFolderId });
	await moveCachedFiles(accountId, plan.fileIds, plan.targetFolderId);
};

/**
 * フォルダを1件ずつ移動し、キャッシュを更新する(進捗はファイル分の後に続けて数える)
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param plan - 移動の実行計画
 */
const moveFoldersSequentially = async (
	accountId: string,
	client: ActionsClient,
	plan: MovePlan,
) => {
	const offset = plan.fileIds.length > 0 ? 1 : 0;
	const total = planTotal(plan);
	for (const [index, folderId] of plan.folderIds.entries()) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		await client.driveFoldersUpdate({ folderId, parentId: plan.targetFolderId });
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		await moveCachedFolder(accountId, folderId, plan.targetFolderId);
		plan.onProgress?.(offset + index + 1, total);
	}
};

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
		/** 進捗通知(完了件数, 全件数)。ファイルはまとめて1件分、フォルダは1件ずつ数える */
		onProgress?: ProgressCallback;
	},
) => {
	const plan = planMove(input);
	const total = planTotal(plan);
	plan.onProgress?.(0, total);

	try {
		if (plan.fileIds.length > 0) {
			await moveFilesBulk(accountId, client, plan);
			plan.onProgress?.(1, total);
		}

		await moveFoldersSequentially(accountId, client, plan);
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
		/** 1件取り込むごとに呼ぶ進捗通知(完了件数, 全件数) */
		onProgress?: ProgressCallback;
	},
) => {
	const total = input.files.length;
	input.onProgress?.(0, total);

	try {
		for (const [index, file] of input.files.entries()) {
			// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
			await client.driveFilesUploadFromUrl({
				url: file.url,
				folderId: input.targetFolderId,
				isSensitive: file.isSensitive,
				comment: file.comment,
			});
			input.onProgress?.(index + 1, total);
		}
	} catch (error) {
		throw translateDriveError(error);
	}
};
