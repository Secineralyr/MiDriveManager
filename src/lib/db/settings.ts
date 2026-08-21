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
