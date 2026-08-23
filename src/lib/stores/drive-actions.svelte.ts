import type { ActionsClient, DriveItem, FileMetadata } from '../services/drive-actions';
import {
	createFolder,
	deleteItems,
	renameFile,
	renameFolder,
	updateFileMetadata,
} from '../services/drive-actions';
import type { AccountRecord } from '../db/schema';
import { createDriveClient } from '../api/client';

/** 基本操作用APIクライアントの生成関数 */
type ActionsClientFactory = (host: string, token: string) => ActionsClient;

/** 基本操作の状態 */
type ActionsState = {
	/** 操作の実行中かどうか */
	busy: boolean;
	/** エラーメッセージ(正常時はnull) */
	error: string | null;
};

const state = $state<ActionsState>({
	busy: false,
	error: null,
});

/**
 * 操作を実行し、実行中フラグとエラーメッセージを状態へ反映する
 * @param task - 実行する操作
 * @returns 成功したらtrue
 */
const withAction = async (task: () => Promise<void>) => {
	if (state.busy) {
		return false;
	}

	state.busy = true;
	state.error = null;

	try {
		await task();
		return true;
	} catch (error) {
		state.error = error instanceof Error ? error.message : '操作に失敗しました';
		return false;
	} finally {
		state.busy = false;
	}
};

/** ドライブの基本操作(作成・リネーム・メタデータ編集・削除)を実行するストア */
export const driveActionsStore = {
	/**
	 * 操作の実行中かどうか
	 * @returns 実行中ならtrue
	 */
	get busy() {
		return state.busy;
	},

	/**
	 * エラーメッセージ
	 * @returns メッセージ。正常時はnull
	 */
	get error() {
		return state.error;
	},

	/** エラーメッセージを消す */
	clearError() {
		state.error = null;
	},

	/**
	 * フォルダを作成する
	 * @param account - 対象アカウント
	 * @param input - フォルダ名と親フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 成功したらtrue
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
		return withAction(async () => {
			await createFolder(account.id, clientFactory(account.host, account.token), input);
		});
	},

	/**
	 * 項目の名前を変更する
	 * @param account - 対象アカウント
	 * @param input - 対象の項目と新しい名前
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 成功したらtrue
	 */
	rename(
		account: AccountRecord,
		input: {
			/** 対象の項目 */
			item: DriveItem;
			/** 新しい名前 */
			name: string;
		},
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		return withAction(async () => {
			const client = clientFactory(account.host, account.token);
			await (input.item.kind === 'file'
				? renameFile(account.id, client, { fileId: input.item.id, name: input.name })
				: renameFolder(account.id, client, { folderId: input.item.id, name: input.name }));
		});
	},

	/**
	 * ファイルのメタデータ(コメント・センシティブ)を更新する
	 * @param account - 対象アカウント
	 * @param input - 対象のファイルIDと更新するメタデータ
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 成功したらtrue
	 */
	saveFileMetadata(
		account: AccountRecord,
		input: {
			/** 対象のファイルID */
			fileId: string;
			/** 更新するメタデータ */
			metadata: FileMetadata;
		},
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		return withAction(async () => {
			await updateFileMetadata(account.id, clientFactory(account.host, account.token), input);
		});
	},

	/**
	 * 複数の項目を削除する
	 * @param account - 対象アカウント
	 * @param items - 削除する項目の一覧
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 成功したらtrue
	 */
	deleteItems(
		account: AccountRecord,
		items: DriveItem[],
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		return withAction(async () => {
			await deleteItems(account.id, clientFactory(account.host, account.token), items);
		});
	},
};
