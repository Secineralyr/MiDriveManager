import type { AccountRecord, FileRecord } from '../db/schema';
import type { ActionsClient, DriveItem } from '../services/drive-actions';
import type { UploadClient, UploadEntry } from '../services/upload';
import { collectDownloadEntries, downloadEntries } from '../services/download';
import { copyFilesToFolder, moveItems, selectItemsToMove } from '../services/drive-move';
import { createFolder, deleteItems } from '../services/drive-actions';
import { downloadLabel, notifyExisting, uploadLabel, zipNameFor } from './drive-task-labels';
import { filesToUploadEntries, readDroppedEntries, uploadEntries } from '../services/upload';
import type { ProgressReporter } from './queue.svelte';
import { createDriveClient } from '../api/client';
import { driveStore } from './drive.svelte';
import { queueStore } from './queue.svelte';
import { syncStore } from './sync.svelte';

/** 一括操作用APIクライアントの生成関数 */
type ActionsClientFactory = (host: string, token: string) => ActionsClient;

/** アップロード用APIクライアントの生成関数 */
type UploadClientFactory = (host: string, token: string) => UploadClient;

/** ダウンロードの取得・保存の差し替え(テスト用) */
type DownloadOverrides = Pick<Parameters<typeof downloadEntries>[0], 'fetchImpl' | 'save'>;

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
	 * 項目のダウンロードをキューへ積む(1件のファイルはそのまま、それ以外はzip)
	 * @param account - 対象アカウント
	 * @param items - ダウンロードする項目
	 * @param overrides - 取得・保存の差し替え(テスト用)
	 * @returns 積んだタスクの識別子。対象が空ならnull
	 */
	download(account: AccountRecord, items: DriveItem[], overrides: DownloadOverrides = {}) {
		if (items.length === 0) {
			return null;
		}

		return queueStore.enqueue({
			account,
			kind: 'download',
			label: downloadLabel(items),
			run: async (report) => {
				const entries = await collectDownloadEntries(account.id, items);
				if (entries.length === 0) {
					throw new Error('ダウンロードできるファイルがありません');
				}

				const [first] = items;
				await downloadEntries({
					entries,
					zipName: zipNameFor(items),
					forceZip: !(items.length === 1 && first?.kind === 'file'),
					onProgress: report,
					...overrides,
				});
			},
		});
	},

	/**
	 * フォルダの作成をキューへ積む
	 * @param account - 対象アカウント
	 * @param input - フォルダ名と親フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 積んだタスクの識別子
	 */
	createFolder(
		account: AccountRecord,
		input: {
			/** フォルダ名 */
			name: string;
			/** 親フォルダID(ルート直下はnull) */
			parentId: string | null;
		},
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		return queueStore.enqueue({
			account,
			kind: 'create',
			label: `フォルダ「${input.name}」を作成`,
			run: withRefresh(account.id, async (report) => {
				report(0, 1);
				await createFolder(account.id, clientFactory(account.host, account.token), input);
				report(1, 1);
			}),
		});
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
	 * 移動先自身や、すでに移動先に入っている項目は除外し、移動が必要な項目がなければ積まない
	 * @param account - 対象アカウント
	 * @param input - 移動する項目と移動先フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 積んだタスクの識別子。移動が必要な項目がなければnull
	 */
	async moveItems(
		account: AccountRecord,
		input: {
			/** 移動する項目の一覧 */
			items: DriveItem[];
			/** 移動先のフォルダID(ルートはnull) */
			targetFolderId: string | null;
		},
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		const items = await selectItemsToMove(account.id, input.items, input.targetFolderId);
		if (items.length === 0) {
			return null;
		}

		return queueStore.enqueue({
			account,
			kind: 'move',
			label: `${items.length}件の移動`,
			run: withRefresh(account.id, (report) =>
				moveItems(account.id, clientFactory(account.host, account.token), {
					items,
					targetFolderId: input.targetFolderId,
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
