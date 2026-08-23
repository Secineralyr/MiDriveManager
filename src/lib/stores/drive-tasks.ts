import type { AccountRecord, FileRecord } from '../db/schema';
import type { ActionsClient, DriveItem } from '../services/drive-actions';
import type { UploadClient, UploadEntry } from '../services/upload';
import { copyFilesToFolder, moveItems } from '../services/drive-move';
import { filesToUploadEntries, readDroppedEntries, uploadEntries } from '../services/upload';
import type { ProgressReporter } from './queue.svelte';
import { createDriveClient } from '../api/client';
import { deleteItems } from '../services/drive-actions';
import { driveStore } from './drive.svelte';
import { queueStore } from './queue.svelte';
import { syncStore } from './sync.svelte';
import { toastStore } from './toast.svelte';

/** 一括操作用APIクライアントの生成関数 */
type ActionsClientFactory = (host: string, token: string) => ActionsClient;

/** アップロード用APIクライアントの生成関数 */
type UploadClientFactory = (host: string, token: string) => UploadClient;

/**
 * アップロードタスクの表示名を作る
 * @param entries - アップロード対象の一覧
 * @returns 表示名(1件ならファイル名、複数なら件数)
 */
const uploadLabel = (entries: UploadEntry[]) => {
	const [first] = entries;
	if (entries.length === 1 && first !== undefined) {
		return `${first.file.name}をアップロード`;
	}

	return `${entries.length}件のアップロード`;
};

/**
 * 既存のファイルが返された件数をトーストで知らせる
 * @param count - 既存のファイルが返された件数
 */
const notifyExisting = (count: number) => {
	if (count === 0) {
		return;
	}

	toastStore.show({
		kind: 'info',
		message: `${count}件は同じ内容のファイルが既にあるため、既存のファイルをそのまま使用しました`,
	});
};

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

/** ドライブの一括操作(アップロード・削除・移動・複製)を操作キューへ積む窓口 */
export const driveTasks = {
	/**
	 * ファイルのアップロードをキューへ積む
	 * 完了後、同じ内容のファイルが既にあって既存が返された件数があればトーストで知らせる
	 * @param account - アップロード先のアカウント
	 * @param input - アップロード対象とアップロード先フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 積んだタスクの識別子。対象が空ならnull
	 */
	uploadEntries(
		account: AccountRecord,
		input: {
			/** アップロード対象の一覧 */
			entries: UploadEntry[];
			/** アップロード先のフォルダID(ルートはnull) */
			targetFolderId: string | null;
		},
		clientFactory: UploadClientFactory = createDriveClient,
	) {
		if (input.entries.length === 0) {
			return null;
		}

		return queueStore.enqueue({
			account,
			kind: 'upload',
			label: uploadLabel(input.entries),
			run: withRefresh(account.id, async (report) => {
				let existingCount = 0;
				await uploadEntries(account.id, clientFactory(account.host, account.token), {
					...input,
					onProgress: report,
					onExisting: () => {
						existingCount += 1;
					},
				});
				notifyExisting(existingCount);
			}),
		});
	},

	/**
	 * ファイル選択やクリップボードからのファイルのアップロードをキューへ積む
	 * @param account - アップロード先のアカウント
	 * @param input - ファイルの一覧とアップロード先フォルダID
	 * @returns 積んだタスクの識別子。対象が空ならnull
	 */
	uploadFiles(
		account: AccountRecord,
		input: {
			/** アップロードするファイルの一覧 */
			files: File[];
			/** アップロード先のフォルダID(ルートはnull) */
			targetFolderId: string | null;
		},
	) {
		return this.uploadEntries(account, {
			entries: filesToUploadEntries(input.files),
			targetFolderId: input.targetFolderId,
		});
	},

	/**
	 * OSからドロップされたファイル・フォルダを走査し、アップロードをキューへ積む
	 * webkitGetAsEntryはdropイベント中にしか呼べないため、走査の開始は同期的に行う
	 * @param account - アップロード先のアカウント
	 * @param input - ドロップされたデータとアップロード先フォルダID
	 * @returns 積んだタスクの識別子。対象が空ならnull
	 */
	async uploadDropped(
		account: AccountRecord,
		input: {
			/** ドロップされたデータ */
			transfer: DataTransfer;
			/** アップロード先のフォルダID(ルートはnull) */
			targetFolderId: string | null;
		},
	) {
		const entries = await readDroppedEntries(input.transfer);
		return this.uploadEntries(account, { entries, targetFolderId: input.targetFolderId });
	},

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
