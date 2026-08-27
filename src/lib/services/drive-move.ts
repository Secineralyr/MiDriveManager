import type { ActionsClient, DriveItem } from './drive-actions';
import {
	getCachedFile,
	getCachedFolder,
	moveCachedFiles,
	moveCachedFolder,
} from '../db/drive-cache';
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
	/** 進捗通知。ファイル・フォルダとも1件ずつ数える(move-bulk成功時はファイル分をまとめて進める) */
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
 * 計画の全件数(ファイルとフォルダの合計)を返す
 * @param plan - 移動の実行計画
 * @returns 全件数
 */
const planTotal = (plan: MovePlan) => plan.fileIds.length + plan.folderIds.length;

/**
 * ファイルを1件ずつ移動する(drive/files/move-bulkがない古いMisskey向けのフォールバック)
 * updateを1回打つごとにキャッシュを更新し、進捗を通知する
 * (途中で失敗しても完了分はキャッシュに反映済みになり、再試行の事前選別で除外できる)
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param plan - 移動の実行計画
 */
const moveFilesOneByOne = async (accountId: string, client: ActionsClient, plan: MovePlan) => {
	const total = planTotal(plan);
	for (const [index, fileId] of plan.fileIds.entries()) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		await client.driveFilesUpdate({ fileId, folderId: plan.targetFolderId });
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
		await moveCachedFiles(accountId, [fileId], plan.targetFolderId);
		plan.onProgress?.(index + 1, total);
	}
};

/**
 * ファイルをまとめて移動し、キャッシュを更新する
 * move-bulkに失敗した場合(比較的新しいAPIのため古いMisskeyには存在しない)は1件ずつの移動へ切り替える
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param plan - 移動の実行計画
 */
const moveFilesBulk = async (accountId: string, client: ActionsClient, plan: MovePlan) => {
	try {
		await client.driveFilesMoveBulk({ fileIds: plan.fileIds, folderId: plan.targetFolderId });
	} catch {
		// フォールバック側が1件ずつキャッシュを更新するのでここでのまとめて更新はしない
		await moveFilesOneByOne(accountId, client, plan);
		return;
	}

	plan.onProgress?.(plan.fileIds.length, planTotal(plan));
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
	const offset = plan.fileIds.length;
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
 * 項目を移動すると実際に場所が変わるかどうかを判定する
 * キャッシュに無い項目は判定できないため、移動が必要なものとして扱う
 * @param accountId - 対象アカウントのアプリ内ID
 * @param item - 移動する項目
 * @param targetFolderId - 移動先のフォルダID(ルートはnull)
 * @returns 場所が変わるならtrue
 */
const isMoveNeeded = async (accountId: string, item: DriveItem, targetFolderId: string | null) => {
	if (item.kind === 'file') {
		const record = await getCachedFile(accountId, item.id);
		return record === undefined || record.folderId !== targetFolderId;
	}

	if (item.id === targetFolderId) {
		return false;
	}

	const record = await getCachedFolder(accountId, item.id);
	return record === undefined || record.parentId !== targetFolderId;
};

/**
 * 移動対象から、移動しても場所が変わらない項目を除外する
 * (すでに移動先に入っている項目や移動先自身を除き、不要なキュー投入とAPI呼び出しを避ける)
 * @param accountId - 対象アカウントのアプリ内ID
 * @param items - 移動する項目の一覧
 * @param targetFolderId - 移動先のフォルダID(ルートはnull)
 * @returns 移動が必要な項目の一覧
 */
export const selectItemsToMove = async (
	accountId: string,
	items: DriveItem[],
	targetFolderId: string | null,
) => {
	const needed = await Promise.all(
		items.map((item) => isMoveNeeded(accountId, item, targetFolderId)),
	);
	return items.filter((unused, index) => needed[index]);
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
		/** 進捗通知(完了件数, 全件数)。ファイル・フォルダとも1件ずつ数える */
		onProgress?: ProgressCallback;
	},
) => {
	const plan = planMove(input);
	const total = planTotal(plan);
	plan.onProgress?.(0, total);

	try {
		if (plan.fileIds.length > 0) {
			await moveFilesBulk(accountId, client, plan);
		}

		await moveFoldersSequentially(accountId, client, plan);
	} catch (error) {
		throw translateDriveError(error);
	}
};
