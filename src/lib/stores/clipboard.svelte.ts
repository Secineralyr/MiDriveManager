import type { AccountRecord, FileRecord } from '../db/schema';
import type { ActionsClient, DriveItem } from '../services/drive-actions';
import { createDriveClient } from '../api/client';
import { driveActionsStore } from './drive-actions.svelte';
import { getCachedFile } from '../db/drive-cache';
import { syncStore } from './sync.svelte';

/** 基本操作用APIクライアントの生成関数 */
type ActionsClientFactory = (host: string, token: string) => ActionsClient;

/** 貼り付けの結果 */
type PasteResultShape = 'moved' | 'copied' | 'noop' | 'error';

/** クリップボードの状態 */
type ClipboardState = {
	/** 操作の種類(空ならnull) */
	mode: 'copy' | 'cut' | null;
	/** 保持している項目 */
	items: DriveItem[];
	/** 項目の取得元アカウントID(空ならnull) */
	sourceAccountId: string | null;
	/** 貼り付けのエラーメッセージ(正常時はnull) */
	error: string | null;
};

const state = $state<ClipboardState>({
	mode: null,
	items: [],
	sourceAccountId: null,
	error: null,
});

/** クリップボードの内容を破棄する */
const resetContent = () => {
	state.mode = null;
	state.items = [];
	state.sourceAccountId = null;
};

/**
 * クリップボードのコピー元ファイルをキャッシュから読み込む
 * @returns ファイル項目の件数と、キャッシュに残っていたファイルの一覧
 */
const loadClipboardFiles = async () => {
	const sourceAccountId = state.sourceAccountId ?? '';
	const fileItems = state.items.filter((item) => item.kind === 'file');

	const loaded = await Promise.all(
		fileItems.map((item) => getCachedFile(sourceAccountId, item.id)),
	);
	
	return {
		fileCount: fileItems.length,
		files: loaded.filter((file): file is FileRecord => file !== undefined),
	};
};

/**
 * 切り取った項目を移動として貼り付ける
 * @param account - 貼り付け先のアカウント
 * @param targetFolderId - 貼り付け先のフォルダID(ルートはnull)
 * @param clientFactory - APIクライアントの生成関数
 * @returns 貼り付けの結果
 */
const pasteCut = async (
	account: AccountRecord,
	targetFolderId: string | null,
	clientFactory: ActionsClientFactory,
): Promise<PasteResultShape> => {
	if (state.sourceAccountId !== account.id) {
		state.error = '切り取った項目は同じアカウント内にのみ移動できます';
		return 'error';
	}
	
	const ok = await driveActionsStore.moveItems(
		account,
		{ items: state.items, targetFolderId },
		clientFactory,
	);
	if (!ok) {
		return 'error';
	}
	
	resetContent();
	return 'moved';
};

/**
 * コピー貼り付けの前提を確認し、問題があればエラーメッセージを返す
 * @param fileCount - クリップボード内のファイル項目の件数
 * @param files - キャッシュから読み込めたファイル
 * @returns エラーメッセージ。問題なければnull
 */
const validateCopySource = (fileCount: number, files: FileRecord[]) => {
	if (fileCount === 0) {
		return 'フォルダはコピーできません';
	}
	
	if (files.length === 0) {
		return 'コピー元のファイルが見つかりません';
	}
	
	return null;
};

/**
 * コピーしたファイルを複製として貼り付ける
 * 複製はサーバー側で非同期に処理されるため、完了後に全量同期を開始する
 * @param account - 貼り付け先のアカウント
 * @param targetFolderId - 貼り付け先のフォルダID(ルートはnull)
 * @param clientFactory - APIクライアントの生成関数
 * @returns 貼り付けの結果
 */
const pasteCopy = async (
	account: AccountRecord,
	targetFolderId: string | null,
	clientFactory: ActionsClientFactory,
): Promise<PasteResultShape> => {
	const { fileCount, files } = await loadClipboardFiles();
	const validationError = validateCopySource(fileCount, files);
	if (validationError !== null) {
		state.error = validationError;
		return 'error';
	}
	
	const ok = await driveActionsStore.copyFiles(account, { files, targetFolderId }, clientFactory);
	if (!ok) {
		return 'error';
	}
	
	syncStore.run(account);
	return 'copied';
};

/** 貼り付けの結果 */
export type PasteResult = PasteResultShape;

/** アプリ内クリップボード(コピー/切り取りした項目)を管理するストア */
export const clipboardStore = {
	/**
	 * 操作の種類
	 * @returns copy(コピー)、cut(切り取り)、null(空)のいずれか
	 */
	get mode() {
		return state.mode;
	},

	/**
	 * 保持している項目
	 * @returns 項目の配列
	 */
	get items() {
		return state.items;
	},

	/**
	 * 項目の取得元アカウントID
	 * @returns アカウントID。空ならnull
	 */
	get sourceAccountId() {
		return state.sourceAccountId;
	},

	/**
	 * 内容を保持しているかどうか
	 * @returns 保持していればtrue
	 */
	get hasContent() {
		return state.mode !== null && state.items.length > 0;
	},

	/**
	 * 貼り付けのエラーメッセージ
	 * @returns メッセージ。正常時はnull
	 */
	get error() {
		return state.error;
	},

	/** エラーメッセージを消す(保持している項目は残る) */
	clearError() {
		state.error = null;
	},

	/**
	 * 項目をコピーとして保持する
	 * @param accountId - 取得元アカウントID
	 * @param items - 保持する項目
	 */
	setCopy(accountId: string, items: DriveItem[]) {
		state.mode = 'copy';
		state.items = [...items];
		state.sourceAccountId = accountId;
		state.error = null;
	},

	/**
	 * 項目を切り取りとして保持する
	 * @param accountId - 取得元アカウントID
	 * @param items - 保持する項目
	 */
	setCut(accountId: string, items: DriveItem[]) {
		state.mode = 'cut';
		state.items = [...items];
		state.sourceAccountId = accountId;
		state.error = null;
	},

	/**
	 * クリップボードの内容を表示中フォルダへ貼り付ける
	 * 切り取りは移動として実行し、コピーはURL取り込みによる複製として実行する
	 * @param account - 貼り付け先のアカウント
	 * @param targetFolderId - 貼り付け先のフォルダID(ルートはnull)
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 貼り付けの結果
	 */
	pasteInto(
		account: AccountRecord,
		targetFolderId: string | null,
		clientFactory: ActionsClientFactory = createDriveClient,
	): Promise<PasteResult> {
		if (!this.hasContent) {
			return Promise.resolve('noop');
		}
		
		state.error = null;
		if (state.mode === 'cut') {
			return pasteCut(account, targetFolderId, clientFactory);
		}
		
		return pasteCopy(account, targetFolderId, clientFactory);
	},

	/** クリップボードを空にする */
	clear() {
		resetContent();
		state.error = null;
	},
};
