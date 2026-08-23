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

/**
 * 初回利用時の諸注意に同意済みかどうかを取得する
 * @returns 同意済みならtrue。未設定ならfalse
 */
export const getNoticeAccepted = async () => {
	const db = await openDatabase();
	const value = await db.get('settings', 'noticeAccepted');
	return value === true;
};

/** 初回利用時の諸注意に同意したことを保存する */
export const setNoticeAccepted = async () => {
	const db = await openDatabase();
	await db.put('settings', true, 'noticeAccepted');
};

/**
 * チュートリアルを見終わった(またはスキップした)かどうかを取得する
 * @returns 見終わっていればtrue。未設定ならfalse
 */
export const getTutorialSeen = async () => {
	const db = await openDatabase();
	const value = await db.get('settings', 'tutorialSeen');
	return value === true;
};

/** チュートリアルを見終わった(またはスキップした)ことを保存する */
export const setTutorialSeen = async () => {
	const db = await openDatabase();
	await db.put('settings', true, 'tutorialSeen');
};
