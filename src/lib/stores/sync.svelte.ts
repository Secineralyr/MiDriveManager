import type { AccountRecord } from '../db/schema';
import type { SyncClient } from '../services/sync';
import { createDriveClient } from '../api/client';
import { syncDrive } from '../services/sync';

/** 同期用APIクライアントの生成関数 */
type SyncClientFactory = (host: string, token: string) => SyncClient;

/** 同期の表示状態 */
type SyncState = {
	/** 同期の状態 */
	status: 'idle' | 'syncing' | 'error';
	/** 同期対象のアカウントID(未実行ならnull) */
	accountId: string | null;
	/** 取得済みのフォルダ数 */
	folderCount: number;
	/** 取得済みのファイル数 */
	fileCount: number;
	/** エラーメッセージ(エラー時以外はnull) */
	error: string | null;
};

const state = $state<SyncState>({
	status: 'idle',
	accountId: null,
	folderCount: 0,
	fileCount: 0,
	error: null,
});

/** 実行中の同期を識別するトークン。後から開始した同期だけが状態を更新できる */
let runToken = 0;

/**
 * 同期を実行して状態へ反映する
 * @param account - 同期するアカウント
 * @param clientFactory - APIクライアントの生成関数
 * @param token - この同期のトークン
 */
const syncInBackground = async (
	account: AccountRecord,
	clientFactory: SyncClientFactory,
	token: number,
) => {
	try {
		const client = clientFactory(account.host, account.token);
		await syncDrive(account, client, (progress) => {
			if (token === runToken) {
				state.folderCount = progress.folderCount;
				state.fileCount = progress.fileCount;
			}
		});
		if (token === runToken) {
			state.status = 'idle';
		}
	} catch (error) {
		if (token === runToken) {
			state.status = 'error';
			state.error = error instanceof Error ? error.message : '同期に失敗しました';
		}
	}
};

/** ドライブ同期の状態を管理するストア */
export const syncStore = {
	/**
	 * 同期の状態
	 * @returns idle(未実行または完了)、syncing(実行中)、error(失敗)のいずれか
	 */
	get status() {
		return state.status;
	},

	/**
	 * 同期対象のアカウントID
	 * @returns アカウントID。未実行ならnull
	 */
	get accountId() {
		return state.accountId;
	},

	/**
	 * 取得済みのフォルダ数
	 * @returns フォルダ数
	 */
	get folderCount() {
		return state.folderCount;
	},

	/**
	 * 取得済みのファイル数
	 * @returns ファイル数
	 */
	get fileCount() {
		return state.fileCount;
	},

	/**
	 * エラーメッセージ
	 * @returns メッセージ。エラー時以外はnull
	 */
	get error() {
		return state.error;
	},

	/**
	 * アカウントのドライブ同期を開始する
	 * 同じアカウントの同期が実行中の場合は何もしない。別アカウントの同期を開始した場合は
	 * 新しい同期だけが状態へ反映される
	 * @param account - 同期するアカウント
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 */
	run(account: AccountRecord, clientFactory: SyncClientFactory = createDriveClient) {
		if (state.status === 'syncing' && state.accountId === account.id) {
			return;
		}

		runToken += 1;
		state.status = 'syncing';
		state.accountId = account.id;
		state.folderCount = 0;
		state.fileCount = 0;
		state.error = null;

		const _ = syncInBackground(account, clientFactory, runToken);
	},
};
