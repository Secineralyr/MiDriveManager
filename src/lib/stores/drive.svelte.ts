import type { FileRecord, FolderRecord } from '../db/schema';
import type { SortKey, SortOrder } from '../utils/drive-sort';
import { buildChildrenMap, folderPath } from '../services/folder-tree';
import { getViewMode, setViewMode } from '../db/settings';
import { listAccountFolders, listFilesInFolder } from '../db/drive-cache';
import { sortFiles, sortFolders } from '../utils/drive-sort';
import type { ViewMode } from '../db/settings';

/** ドライブ閲覧の状態 */
type DriveState = {
	/** 表示中のアカウントID(未表示ならnull) */
	accountId: string | null;
	/** 表示中のフォルダID(ルートはnull) */
	currentFolderId: string | null;
	/** アカウントの全フォルダ(ツリーとパンくずに使う) */
	allFolders: FolderRecord[];
	/** 表示中フォルダ直下のファイル */
	files: FileRecord[];
	/** 表示モード */
	viewMode: ViewMode;
	/** 並び替えの基準 */
	sortKey: SortKey;
	/** 並び替えの方向 */
	sortOrder: SortOrder;
	/** 読み込み中かどうか */
	loading: boolean;
	/** エラーメッセージ(正常時はnull) */
	error: string | null;
};

const state = $state<DriveState>({
	accountId: null,
	currentFolderId: null,
	allFolders: [],
	files: [],
	viewMode: 'list',
	sortKey: 'name',
	sortOrder: 'asc',
	loading: false,
	error: null,
});

/**
 * 読み込み処理を実行し、失敗時はエラーメッセージを状態へ反映する
 * @param task - 実行する読み込み処理
 */
const withLoading = async (task: () => Promise<void>) => {
	state.loading = true;
	state.error = null;
	try {
		await task();
	} catch (error) {
		state.error = error instanceof Error ? error.message : '読み込みに失敗しました';
	}
	state.loading = false;
};

/** ドライブ閲覧の状態を管理するストア */
export const driveStore = {
	/**
	 * 表示中のアカウントID
	 * @returns アカウントID。未表示ならnull
	 */
	get accountId() {
		return state.accountId;
	},

	/**
	 * 表示中のフォルダID
	 * @returns フォルダID。ルートならnull
	 */
	get currentFolderId() {
		return state.currentFolderId;
	},

	/**
	 * アカウントの全フォルダ
	 * @returns フォルダの配列
	 */
	get allFolders() {
		return state.allFolders;
	},

	/**
	 * 親キーごとの子フォルダ一覧(名前順)
	 * @returns 親キーごとの子フォルダ一覧
	 */
	get childrenMap() {
		return buildChildrenMap(state.allFolders);
	},

	/**
	 * 表示中フォルダ直下のフォルダ(並び替え済み)
	 * @returns フォルダの配列
	 */
	get childFolders() {
		const parentKey = state.currentFolderId ?? '';
		const children = state.allFolders.filter((folder) => folder.parentKey === parentKey);
		return sortFolders(children, state.sortKey, state.sortOrder);
	},

	/**
	 * 表示中フォルダ直下のファイル(並び替え済み)
	 * @returns ファイルの配列
	 */
	get files() {
		return sortFiles(state.files, state.sortKey, state.sortOrder);
	},

	/**
	 * ルートから表示中フォルダまでの経路
	 * @returns フォルダの配列(ルート自体は含まない)
	 */
	get breadcrumb() {
		return folderPath(state.allFolders, state.currentFolderId);
	},

	/**
	 * 表示モード
	 * @returns listまたはgrid
	 */
	get viewMode() {
		return state.viewMode;
	},

	/**
	 * 並び替えの基準
	 * @returns 並び替えの基準
	 */
	get sortKey() {
		return state.sortKey;
	},

	/**
	 * 並び替えの方向
	 * @returns 並び替えの方向
	 */
	get sortOrder() {
		return state.sortOrder;
	},

	/**
	 * 読み込み中かどうか
	 * @returns 読み込み中ならtrue
	 */
	get loading() {
		return state.loading;
	},

	/**
	 * エラーメッセージ
	 * @returns メッセージ。正常時はnull
	 */
	get error() {
		return state.error;
	},

	/**
	 * アカウントのドライブを開いてルートを表示する
	 * @param accountId - 表示するアカウントのアプリ内ID
	 */
	async openAccount(accountId: string) {
		await withLoading(async () => {
			state.accountId = accountId;
			state.currentFolderId = null;
			state.sortKey = 'name';
			state.sortOrder = 'asc';
			state.viewMode = await getViewMode();
			state.allFolders = await listAccountFolders(accountId);
			state.files = await listFilesInFolder(accountId, null);
		});
	},

	/**
	 * フォルダを開く
	 * @param folderId - 開くフォルダID(ルートはnull)
	 */
	async openFolder(folderId: string | null) {
		const { accountId } = state;
		if (accountId === null) {
			return;
		}
		await withLoading(async () => {
			state.currentFolderId = folderId;
			state.files = await listFilesInFolder(accountId, folderId);
		});
	},

	/**
	 * キャッシュから再読み込みする
	 * 表示中のフォルダが存在しなくなっていた場合はルートへ戻る
	 */
	async refresh() {
		const { accountId } = state;
		if (accountId === null) {
			return;
		}
		await withLoading(async () => {
			state.allFolders = await listAccountFolders(accountId);
			const current = state.currentFolderId;
			const exists =
				current === null || state.allFolders.some((folder) => folder.id === current);
			if (!exists) {
				state.currentFolderId = null;
			}
			state.files = await listFilesInFolder(accountId, state.currentFolderId);
		});
	},

	/**
	 * 表示モードを切り替えて保存する
	 * @param mode - 表示モード
	 */
	async changeViewMode(mode: ViewMode) {
		state.viewMode = mode;
		try {
			await setViewMode(mode);
		} catch {
			// 保存に失敗しても表示自体は切り替わるため無視する
		}
	},

	/**
	 * 並び替えを切り替える(同じ基準なら方向を反転、別の基準なら昇順で設定)
	 * @param key - 並び替えの基準
	 */
	toggleSort(key: SortKey) {
		if (state.sortKey === key) {
			state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			state.sortKey = key;
			state.sortOrder = 'asc';
		}
	},
};
