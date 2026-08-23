import type { AccountRecord, FileRecord } from '../db/schema';
import type { ActionsClient, DriveItem, FileMetadata } from '../services/drive-actions';
import { copyFilesToFolder, moveItems } from '../services/drive-move';
import {
	createFolder,
	deleteItems,
	renameFile,
	renameFolder,
	updateFileMetadata,
} from '../services/drive-actions';
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

	/**
	 * 複数の項目を指定フォルダへ移動する
	 * @param account - 対象アカウント
	 * @param input - 移動する項目と移動先フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 成功したらtrue
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
		return withAction(async () => {
			await moveItems(account.id, clientFactory(account.host, account.token), input);
		});
	},

	/**
	 * ファイルのURL取り込みで複製を作る(コピー&ペースト用)
	 * @param account - 複製先のアカウント
	 * @param input - 複製するファイルと複製先フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 成功したらtrue
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
		return withAction(async () => {
			await copyFilesToFolder(clientFactory(account.host, account.token), input);
		});
	},
};
