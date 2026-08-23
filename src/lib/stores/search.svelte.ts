import { listAccountFiles, listAccountFolders } from '../db/drive-cache';
import type { DriveItem } from '../services/drive-actions';
import type { SearchResult } from '../services/search';
import { searchDrive } from '../services/search';

/** 入力が止まってから検索を実行するまでの待ち時間(ミリ秒) */
const DEBOUNCE_MS = 250;

/** 検索の状態 */
type SearchState = {
	/** 検索対象のアカウントID(未設定ならnull) */
	accountId: string | null;
	/** 入力中の検索語 */
	query: string;
	/** 検索結果(検索していない時はnull) */
	result: SearchResult | null;
	/** 検索の実行中かどうか */
	loading: boolean;
};

const state = $state<SearchState>({
	accountId: null,
	query: '',
	result: null,
	loading: false,
});

/** 入力待ちのタイマー(なければnull) */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 実行中の検索を識別するトークン。後から開始した検索だけが結果を反映できる */
let runToken = 0;

/** 入力待ちのタイマーを止める */
const cancelPending = () => {
	if (debounceTimer !== null) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
};

/**
 * キャッシュを読み込んで検索し、最新の検索だけ結果へ反映する
 * @param accountId - 検索対象のアカウントID
 * @param query - 検索語
 * @param token - この検索のトークン
 */
const runSearch = async (accountId: string, query: string, token: number) => {
	state.loading = true;
	try {
		const [folders, files] = await Promise.all([
			listAccountFolders(accountId),
			listAccountFiles(accountId),
		]);

		if (token === runToken) {
			state.result = searchDrive({ query, folders, files });
		}
	} finally {
		if (token === runToken) {
			state.loading = false;
		}
	}
};

/** 検索を止めて結果を消す */
const reset = () => {
	cancelPending();

	runToken += 1;

	state.query = '';
	state.result = null;
	state.loading = false;
};

/** ドライブのローカル検索(キャッシュ対象のインクリメンタル検索)を管理するストア */
export const searchStore = {
	/**
	 * 入力中の検索語
	 * @returns 検索語
	 */
	get query() {
		return state.query;
	},

	/**
	 * 検索中かどうか(検索語が空でない)
	 * @returns 検索中ならtrue
	 */
	get active() {
		return state.query.trim() !== '';
	},

	/**
	 * 検索結果
	 * @returns 検索結果。検索していない、または結果がまだなければnull
	 */
	get result() {
		return state.result;
	},

	/**
	 * 検索の実行中かどうか
	 * @returns 実行中ならtrue
	 */
	get loading() {
		return state.loading;
	},

	/**
	 * 検索対象のアカウントを設定する(変わった場合は検索を消す)
	 * @param accountId - アカウントID
	 */
	setAccount(accountId: string) {
		if (state.accountId === accountId) {
			return;
		}

		state.accountId = accountId;
		reset();
	},

	/**
	 * 検索語を更新し、入力が止まってから検索を実行する
	 * @param query - 検索語
	 */
	setQuery(query: string) {
		state.query = query;
		cancelPending();
		if (query.trim() === '') {
			runToken += 1;
			state.result = null;
			state.loading = false;
			return;
		}

		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			this.rerun();
		}, DEBOUNCE_MS);
	},

	/** 現在の検索語で検索し直す(同期完了後など、キャッシュが変わった時に呼ぶ) */
	rerun() {
		const { accountId, query } = state;
		if (accountId === null || query.trim() === '') {
			return;
		}

		runToken += 1;
		const _ = runSearch(accountId, query, runToken);
	},

	/** 検索語と結果を消す */
	clear() {
		reset();
	},

	/**
	 * 検索結果から項目の表示名を探す
	 * @param item - 対象の項目
	 * @returns 表示名。結果になければundefined
	 */
	nameOf(item: DriveItem) {
		const { result } = state;
		const found =
			item.kind === 'file'
				? result?.files.find((file) => file.id === item.id)
				: result?.folders.find((folder) => folder.id === item.id);

		return found?.name;
	},
};
