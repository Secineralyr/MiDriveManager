import type { ActionsClient, DriveItem } from '../services/drive-actions';
import type { AccountRecord } from '../db/schema';
import { createDriveClient } from '../api/client';
import { driveTasks } from './drive-tasks';

/** 基本操作用APIクライアントの生成関数 */
type ActionsClientFactory = (host: string, token: string) => ActionsClient;

/** 貼り付けの結果 */
type PasteResultShape = 'moved' | 'noop' | 'error';

/** クリップボードの状態 */
type ClipboardState = {
	/** 操作の種類(空ならnull) */
	mode: 'cut' | null;
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
 * 切り取った項目の移動を操作キューへ積む
 * @param account - 貼り付け先のアカウント
 * @param targetFolderId - 貼り付け先のフォルダID(ルートはnull)
 * @param clientFactory - APIクライアントの生成関数
 * @returns 貼り付けの結果
 */
const pasteCut = (
	account: AccountRecord,
	targetFolderId: string | null,
	clientFactory: ActionsClientFactory,
): PasteResultShape => {
	if (state.sourceAccountId !== account.id) {
		state.error = '切り取った項目は同じアカウント内にのみ移動できます';
		return 'error';
	}

	const _ = driveTasks.moveItems(account, { items: state.items, targetFolderId }, clientFactory);
	resetContent();
	return 'moved';
};

/** 貼り付けの結果 */
export type PasteResult = PasteResultShape;

/** アプリ内クリップボード(切り取りした項目)を管理するストア */
export const clipboardStore = {
	/**
	 * 操作の種類
	 * @returns cut(切り取り)またはnull(空)
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
	 * 切り取りは移動として操作キューへ積む(実行はキューが行う)
	 * @param account - 貼り付け先のアカウント
	 * @param targetFolderId - 貼り付け先のフォルダID(ルートはnull)
	 * @param clientFactory - APIクライアントの生成関数(テスト用に差し替え可能)
	 * @returns 貼り付けの結果(movedはキューへ積めたことを表す)
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
		return Promise.resolve(pasteCut(account, targetFolderId, clientFactory));
	},

	/** クリップボードを空にする */
	clear() {
		resetContent();
		state.error = null;
	},
};
