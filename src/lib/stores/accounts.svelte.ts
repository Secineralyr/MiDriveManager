import { deleteAccount, listAccounts, putAccount } from '../db/accounts';
import { getActiveAccountId, setActiveAccountId } from '../db/settings';
import type { AccountRecord } from '../db/schema';

/** アカウント作成に必要な最小限のユーザー情報 */
type AccountUserShape = {
	/** ユーザーID */
	id: string;
	/** ユーザー名(@なし) */
	username: string;
	/** 表示名(未設定ならnull) */
	name: string | null;
	/** アバター画像URL */
	avatarUrl: string | null;
};

/** アカウント一覧と選択状態 */
type AccountsState = {
	/** 読み込み済みのアカウント一覧 */
	accounts: AccountRecord[];
	/** アクティブなアカウントのID(未選択ならnull) */
	activeId: string | null;
};

const state = $state<AccountsState>({
	accounts: [],
	activeId: null,
});

/** アカウント作成に必要な最小限のユーザー情報 */
export type AccountUser = AccountUserShape;

/** アカウントの状態を管理するストア */
export const accountsStore = {
	/**
	 * 読み込み済みのアカウント一覧
	 * @returns アカウントの配列
	 */
	get accounts() {
		return state.accounts;
	},

	/**
	 * アクティブなアカウント
	 * @returns アカウント。未選択ならnull
	 */
	get active() {
		return state.accounts.find((account) => account.id === state.activeId) ?? null;
	},

	/**
	 * DBからアカウント一覧と選択状態を読み込む
	 * 保存されていた選択が無効な場合は先頭のアカウントにフォールバックする
	 */
	async load() {
		const [accounts, savedActiveId] = await Promise.all([listAccounts(), getActiveAccountId()]);
		state.accounts = accounts;

		const saved = accounts.find((account) => account.id === savedActiveId);
		const [fallback] = accounts;
		const selected = saved ?? fallback ?? null;
		state.activeId = selected?.id ?? null;
		if (saved === undefined) {
			await setActiveAccountId(state.activeId);
		}
	},

	/**
	 * MiAuthの結果からアカウントを追加(同一アカウントは上書き)してアクティブにする
	 * @param host - サーバーのホスト名
	 * @param token - アクセストークン
	 * @param user - 認証したユーザーの情報
	 * @returns 追加したアカウント
	 */
	async add(host: string, token: string, user: AccountUser) {
		const record: AccountRecord = {
			id: `${host}:${user.id}`,
			host,
			token,
			userId: user.id,
			username: user.username,
			name: user.name ?? user.username,
			avatarUrl: user.avatarUrl ?? null,
			createdAt: new Date().toISOString(),
			lastSyncedAt: null,
		};

		await putAccount(record);

		const index = state.accounts.findIndex((account) => account.id === record.id);
		if (index === -1) {
			state.accounts.push(record);
		} else {
			state.accounts[index] = record;
		}

		await this.switchTo(record.id);

		return record;
	},

	/**
	 * アクティブなアカウントを切り替える
	 * @param accountId - 切り替え先のアカウントID
	 */
	async switchTo(accountId: string) {
		state.activeId = accountId;
		await setActiveAccountId(accountId);
	},

	/**
	 * アカウントをアプリから削除する(キャッシュも削除。サーバー上のデータには影響しない)
	 * 削除後は残っている先頭のアカウントをアクティブにする
	 * @param accountId - 削除するアカウントID
	 */
	async remove(accountId: string) {
		await deleteAccount(accountId);

		state.accounts = state.accounts.filter((account) => account.id !== accountId);
		const [next] = state.accounts;

		state.activeId = next?.id ?? null;
		await setActiveAccountId(state.activeId);
	},
};
