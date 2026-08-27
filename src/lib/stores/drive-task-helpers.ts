import type { ActionsClient, DriveItem } from '../services/drive-actions';
import { moveItems, selectItemsToMove } from '../services/drive-move';
import type { AccountRecord } from '../db/schema';
import type { ProgressReporter } from './queue.svelte';
import type { UploadClient } from '../services/upload';
import { driveStore } from './drive.svelte';

/** 一括操作用APIクライアントの生成関数 */
type ActionsClientFactoryShape = (host: string, token: string) => ActionsClient;

/** アップロード用APIクライアントの生成関数 */
type UploadClientFactoryShape = (host: string, token: string) => UploadClient;

/**
 * 対象アカウントのドライブを表示中なら、キャッシュから再読み込みする
 * @param accountId - タスクの対象アカウントID
 */
const refreshIfShowing = async (accountId: string) => {
	if (driveStore.accountId === accountId) {
		await driveStore.refresh();
	}
};

/** 一括操作用APIクライアントの生成関数 */
export type ActionsClientFactory = ActionsClientFactoryShape;

/** アップロード用APIクライアントの生成関数 */
export type UploadClientFactory = UploadClientFactoryShape;

/**
 * タスクの実行処理を、終了後(成功・失敗を問わず)の再読み込み付きで包む
 * @param accountId - タスクの対象アカウントID
 * @param task - 実行処理
 * @returns 再読み込み付きの実行処理
 */
export const withRefresh =
	(accountId: string, task: (report: ProgressReporter) => Promise<void>) =>
	async (report: ProgressReporter) => {
		try {
			await task(report);
		} finally {
			await refreshIfShowing(accountId);
		}
	};

/**
 * 移動タスクの実行処理を作る
 * 実行のたびに移動済み(キャッシュ反映済み)の項目を除外するため、
 * 途中で失敗した後の再試行は残りの項目だけで途中から再開される
 * @param input - 対象アカウント、移動する項目、移動先、クライアント生成関数
 * @returns タスクの実行処理(進捗は積んだ時点の全体数を分母に報告する)
 */
export const makeMoveRun =
	(input: {
		/** 対象のアカウント */
		account: AccountRecord;
		/** 移動する項目の一覧(積んだ時点の事前選別済み) */
		items: DriveItem[];
		/** 移動先のフォルダID(ルートはnull) */
		targetFolderId: string | null;
		/** APIクライアントの生成関数 */
		clientFactory: ActionsClientFactoryShape;
	}) =>
	async (report: ProgressReporter) => {
		const { account, items, targetFolderId, clientFactory } = input;
		const remaining = await selectItemsToMove(account.id, items, targetFolderId);
		const offset = items.length - remaining.length;

		await moveItems(account.id, clientFactory(account.host, account.token), {
			items: remaining,
			targetFolderId,
			onProgress: (done) => {
				report(offset + done, items.length);
			},
		});
	};
