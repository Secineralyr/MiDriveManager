import type { AccountRecord } from './schema';
import { openDatabase } from './database';

/**
 * 指定アカウントのキャッシュ(files/folders)全件にかかる複合キー範囲を作る
 * 複合キーの2要素目は文字列であり、配列はどの文字列よりも大きく順序付けされるため上限に空配列を使う
 * @param accountId - アプリ内アカウントID
 * @returns キー範囲
 */
const accountKeyRange = (accountId: string) => IDBKeyRange.bound([accountId], [accountId, []]);

/**
 * 登録済みのアカウント一覧を取得する
 * @returns アカウントの配列
 */
export const listAccounts = async () => {
	const db = await openDatabase();
	return db.getAll('accounts');
};

/**
 * アカウントを保存する(同一IDがあれば上書き)
 * @param account - 保存するアカウント
 */
export const putAccount = async (account: AccountRecord) => {
	const db = await openDatabase();
	await db.put('accounts', account);
};

/**
 * アカウントと、そのアカウントに紐づくキャッシュ(ファイル・フォルダ)を削除する
 * @param accountId - 削除するアカウントのアプリ内ID
 */
export const deleteAccount = async (accountId: string) => {
	const db = await openDatabase();
	const range = accountKeyRange(accountId);
	const tx = db.transaction(['accounts', 'files', 'folders'], 'readwrite');
	await Promise.all([
		tx.objectStore('accounts').delete(accountId),
		tx.objectStore('files').delete(range),
		tx.objectStore('folders').delete(range),
		tx.done,
	]);
};
