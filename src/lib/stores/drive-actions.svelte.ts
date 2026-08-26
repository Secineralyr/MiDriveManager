import type { ActionsClient, DriveItem, FileMetadata } from '../services/drive-actions';
import {
	createFolder,
	renameFile,
	renameFolder,
	updateFileMetadata,
} from '../services/drive-actions';
import type { AccountRecord } from '../db/schema';
import { createDriveClient } from '../api/client';
import { driveStore } from './drive.svelte';

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
 * 対象アカウントのドライブを表示中なら、キャッシュから再読み込みする
 * @param accountId - 対象アカウントのアプリ内ID
 */
const refreshIfShowing = async (accountId: string) => {
	if (driveStore.accountId === accountId) {
		await driveStore.refresh();
	}
};

/**
 * 操作を実行し、失敗したらエラーメッセージを状態へ記録する
 * @param task - 実行する操作
 * @returns 成功したらtrue
 */
const runAndCapture = async (task: () => Promise<void>) => {
	try {
		await task();
		return true;
	} catch (error) {
		state.error = error instanceof Error ? error.message : '操作に失敗しました';
		return false;
	}
};

/**
 * 操作を実行し、実行中フラグとエラーメッセージを状態へ反映する
 * 成功時、対象アカウントのドライブを表示中ならキャッシュから再読み込みする
 * @param accountId - 対象アカウントのアプリ内ID
 * @param task - 実行する操作
 * @returns 成功したらtrue
 */
const withAction = async (accountId: string, task: () => Promise<void>) => {
	if (state.busy) {
		return false;
	}

	state.busy = true;
	state.error = null;

	const ok = await runAndCapture(task);
	state.busy = false;
	if (ok) {
		await refreshIfShowing(accountId);
	}

	return ok;
};

/**
 * フォルダを作成して作成したフォルダIDを返す(失敗時はエラーメッセージを記録してnull)
 * @param account - 対象アカウント
 * @param input - フォルダ名と親フォルダID
 * @param clientFactory - APIクライアントの生成関数
 * @returns 作成したフォルダID。失敗した場合はnull
 */
const runCreateFolder = async (
	account: AccountRecord,
	input: {
		/** フォルダ名 */
		name: string;
		/** 親フォルダID(ルート直下はnull) */
		parentId: string | null;
	},
	clientFactory: ActionsClientFactory,
) => {
	try {
		const record = await createFolder(
			account.id,
			clientFactory(account.host, account.token),
			input,
		);
		
		await refreshIfShowing(account.id);
		
		return record.id;
	} catch (error) {
		state.error = error instanceof Error ? error.message : '操作に失敗しました';
		return null;
	}
};

/** ドライブの基本操作(作成・リネーム・メタデータ編集)を実行するストア */
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
	 * フォルダを作成して作成したフォルダIDを返す(移動先選択ダイアログ内での即時作成用)
	 * 失敗した場合はエラーメッセージを状態へ記録してnullを返す(トーストへはAppOverlaysが転送する)
	 * @param account - 対象アカウント
	 * @param input - フォルダ名と親フォルダID
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 作成したフォルダID。失敗した場合はnull
	 */
	async createFolderAt(
		account: AccountRecord,
		input: {
			/** フォルダ名 */
			name: string;
			/** 親フォルダID(ルート直下はnull) */
			parentId: string | null;
		},
		clientFactory: ActionsClientFactory = createDriveClient,
	) {
		if (state.busy) {
			return null;
		}

		state.busy = true;
		state.error = null;
		
		const createdId = await runCreateFolder(account, input, clientFactory);
		
		state.busy = false;
		return createdId;
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
		return withAction(account.id, async () => {
			const client = clientFactory(account.host, account.token);
			await (input.item.kind === 'file'
				? renameFile(account.id, client, { fileId: input.item.id, name: input.name })
				: renameFolder(account.id, client, { folderId: input.item.id, name: input.name }));
		});
	},

	/**
	 * ファイルのメタデータ(説明・センシティブ)を更新する
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
		return withAction(account.id, async () => {
			await updateFileMetadata(account.id, clientFactory(account.host, account.token), input);
		});
	},
};
