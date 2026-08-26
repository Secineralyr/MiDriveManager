import type { ActionsClient } from '../services/drive-actions';
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
