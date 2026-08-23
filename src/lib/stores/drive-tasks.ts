import type { AccountRecord, FileRecord } from '../db/schema';
import type { ActionsClient, DriveItem } from '../services/drive-actions';
import { copyFilesToFolder, moveItems } from '../services/drive-move';
import type { ProgressReporter } from './queue.svelte';
import { createDriveClient } from '../api/client';
import { deleteItems } from '../services/drive-actions';
import { driveStore } from './drive.svelte';
import { queueStore } from './queue.svelte';
import { syncStore } from './sync.svelte';

/** 一括操作用APIクライアントの生成関数 */
type ActionsClientFactory = (host: string, token: string) => ActionsClient;

/**
 * 対象アカウントのドライブを表示中なら、キャッシュから再読み込みする
 * @param accountId - タスクの対象アカウントID
 */
const refreshIfShowing = async (accountId: string) => {
	if (driveStore.accountId === accountId) {
		await driveStore.refresh();
	}
};

/**
 * タスクの実行処理を、終了後(成功・失敗を問わず)の再読み込み付きで包む
 * @param accountId - タスクの対象アカウントID
 * @param task - 実行処理
 * @returns 再読み込み付きの実行処理
 */
const withRefresh =
	(accountId: string, task: (report: ProgressReporter) => Promise<void>) =>
	async (report: ProgressReporter) => {
		try {
			await task(report);
		} finally {
			await refreshIfShowing(accountId);
		}
	};

/** ドライブの一括操作(削除・移動・複製)を操作キューへ積む窓口 */
export const driveTasks = {
	/**
	 * 複数の項目の削除をキューへ積む
	 * @param account - 対象アカウント
	 * @param items - 削除する項目の一覧
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 積んだタスクの識別子
	 */
	deleteItems(
		account: AccountRecord,
		items: DriveItem[],
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		return queueStore.enqueue({
			account,
			kind: 'delete',
			label: `${items.length}件の削除`,
			run: withRefresh(account.id, (report) =>
				deleteItems(account.id, clientFactory(account.host, account.token), {
					items,
					onProgress: report,
				}),
			),
		});
	},

	/**
	 * 複数の項目の移動をキューへ積む
	 * @param account - 対象アカウント
	 * @param input - 移動する項目と移動先フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 積んだタスクの識別子
	 */
	moveItems(
		account: AccountRecord,
		input: {
			/** 移動する項目の一覧 */
			items: DriveItem[];
			/** 移動先のフォルダID(ルートはnull) */
			targetFolderId: string | null;
		},
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		return queueStore.enqueue({
			account,
			kind: 'move',
			label: `${input.items.length}件の移動`,
			run: withRefresh(account.id, (report) =>
				moveItems(account.id, clientFactory(account.host, account.token), {
					...input,
					onProgress: report,
				}),
			),
		});
	},

	/**
	 * ファイルの複製(URL取り込み)をキューへ積む
	 * 複製はサーバー側で非同期に処理されるため、タスク完了後に全量同期を開始して反映する
	 * @param account - 複製先のアカウント
	 * @param input - 複製するファイルと複製先フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 積んだタスクの識別子
	 */
	copyFiles(
		account: AccountRecord,
		input: {
			/** 複製するファイルの一覧 */
			files: FileRecord[];
			/** 複製先のフォルダID(ルートはnull) */
			targetFolderId: string | null;
		},
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		return queueStore.enqueue({
			account,
			kind: 'copy',
			label: `${input.files.length}件の複製`,
			run: async (report) => {
				await copyFilesToFolder(clientFactory(account.host, account.token), {
					...input,
					onProgress: report,
				});
				syncStore.run(account);
			},
		});
	},
};
