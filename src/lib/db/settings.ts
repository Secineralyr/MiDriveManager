import { openDatabase } from './database';

/**
 * アクティブなアカウントIDを取得する
 * @returns アカウントID。未設定ならnull
 */
export const getActiveAccountId = async () => {
	const db = await openDatabase();
	const value = await db.get('settings', 'activeAccountId');
	return typeof value === 'string' ? value : null;
};

/**
 * アクティブなアカウントIDを保存する
 * @param accountId - アカウントID。nullで未選択にする
 */
export const setActiveAccountId = async (accountId: string | null) => {
	const db = await openDatabase();
	await db.put('settings', accountId, 'activeAccountId');
};

/** ファイル一覧の表示モード */
export type ViewMode = 'list' | 'grid';

/**
 * ファイル一覧の表示モードを取得する
 * @returns 表示モード。未設定ならlist
 */
export const getViewMode = async (): Promise<ViewMode> => {
	const db = await openDatabase();
	const value = await db.get('settings', 'viewMode');
	return value === 'grid' ? 'grid' : 'list';
};

/**
 * ファイル一覧の表示モードを保存する
 * @param mode - 表示モード
 */
export const setViewMode = async (mode: ViewMode) => {
	const db = await openDatabase();
	await db.put('settings', mode, 'viewMode');
};
