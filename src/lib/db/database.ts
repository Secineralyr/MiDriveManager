import type { DriveManagerSchema } from './schema';
import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';

const DB_NAME = 'misskey-drive-manager';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DriveManagerSchema>> | null = null;

/**
 * データベースを開く(初回はスキーマを作成する)
 * 接続はモジュール内でキャッシュされ、2回目以降は同じ接続を返す
 * @returns データベース接続
 */
export const openDatabase = () => {
	dbPromise ??= openDB<DriveManagerSchema>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			db.createObjectStore('accounts', { keyPath: 'id' });

			const files = db.createObjectStore('files', { keyPath: ['accountId', 'id'] });
			files.createIndex('byFolder', ['accountId', 'folderKey']);

			const folders = db.createObjectStore('folders', { keyPath: ['accountId', 'id'] });
			folders.createIndex('byParent', ['accountId', 'parentKey']);

			db.createObjectStore('settings');
		},
	});
	return dbPromise;
};

/**
 * データベース接続を閉じて接続キャッシュを破棄する
 */
export const closeDatabase = async () => {
	if (dbPromise !== null) {
		const db = await dbPromise;
		db.close();
		dbPromise = null;
	}
};
