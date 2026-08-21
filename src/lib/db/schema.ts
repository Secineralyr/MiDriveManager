import type { entities } from 'misskey-js';

/** アプリに登録されたMisskeyアカウント */
export type AccountRecord = {
	/** アプリ内アカウントID({host}:{userId}形式) */
	id: string;
	/** サーバーのホスト名 */
	host: string;
	/** APIアクセストークン */
	token: string;
	/** MisskeyのユーザーID */
	userId: string;
	/** ユーザー名(@なし) */
	username: string;
	/** 表示名 */
	name: string;
	/** アバター画像URL */
	avatarUrl: string | null;
	/** アカウント追加日時(ISO 8601文字列) */
	createdAt: string;
	/** 最終同期日時(ISO 8601文字列)。未同期ならnull */
	lastSyncedAt: string | null;
};

/** ドライブファイルのキャッシュレコード */
export type FileRecord = entities.DriveFile & {
	/** 所属するアカウントのアプリ内ID */
	accountId: string;
	/** 親フォルダの索引キー(ルート直下は空文字列)。IndexedDBの索引はnullを扱えないため別に持つ */
	folderKey: string;
};

/** ドライブフォルダのキャッシュレコード */
export type FolderRecord = entities.DriveFolder & {
	/** 所属するアカウントのアプリ内ID */
	accountId: string;
	/** 親フォルダの索引キー(ルート直下は空文字列)。IndexedDBの索引はnullを扱えないため別に持つ */
	parentKey: string;
};

/** settingsストアに保存できる値 */
export type SettingValue = string | number | boolean | null;

/** アプリ全体のIndexedDBスキーマ */
export type DriveManagerSchema = {
	accounts: {
		/** アプリ内アカウントID */
		key: string;
		/** アカウント情報 */
		value: AccountRecord;
	};
	files: {
		/** [accountId, fileId]の複合キー */
		key: [string, string];
		/** ファイルキャッシュ */
		value: FileRecord;
		indexes: {
			/** [accountId, folderKey]でフォルダ内のファイルを引く索引 */
			byFolder: [string, string];
		};
	};
	folders: {
		/** [accountId, folderId]の複合キー */
		key: [string, string];
		/** フォルダキャッシュ */
		value: FolderRecord;
		indexes: {
			/** [accountId, parentKey]で子フォルダを引く索引 */
			byParent: [string, string];
		};
	};
	settings: {
		/** 設定キー */
		key: string;
		/** 設定値 */
		value: SettingValue;
	};
};
