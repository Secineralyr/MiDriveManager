import {
	IDBCursor,
	IDBCursorWithValue,
	IDBDatabase,
	IDBFactory,
	IDBIndex,
	IDBKeyRange,
	IDBObjectStore,
	IDBOpenDBRequest,
	IDBRequest,
	IDBTransaction,
	IDBVersionChangeEvent,
} from 'fake-indexeddb';
import { vi } from 'vitest';

/** IndexedDB関連のコンストラクタ一覧 */
const IDB_CLASS_GLOBALS = {
	IDBCursor,
	IDBCursorWithValue,
	IDBDatabase,
	IDBFactory,
	IDBIndex,
	IDBKeyRange,
	IDBObjectStore,
	IDBOpenDBRequest,
	IDBRequest,
	IDBTransaction,
	IDBVersionChangeEvent,
};

/**
 * IndexedDB関連のグローバルをfake-indexeddbで差し替える(テスト専用)
 * indexedDBは毎回新しいインスタンスにするため、テスト間でデータが共有されない
 */
export const stubIndexedDb = () => {
	vi.stubGlobal('indexedDB', new IDBFactory());
	for (const [name, value] of Object.entries(IDB_CLASS_GLOBALS)) {
		vi.stubGlobal(name, value);
	}
};
