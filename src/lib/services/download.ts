import type { FileRecord, FolderRecord } from '../db/schema';
import { RateLimitError, createRateLimiter } from '../api/rate-limiter';
import { getCachedFile, listAccountFolders, listFilesInFolder } from '../db/drive-cache';
import type { DriveItem } from './drive-actions';
import { buildChildrenMap } from './folder-tree';
import { downloadZip } from 'client-zip';
import { saveBlob } from '../utils/save-file';

/** ダウンロードする1件(zip内の経路付き) */
type DownloadEntryShape = {
	/** ダウンロードするファイル */
	file: FileRecord;
	/** zip内の経路(フォルダ構造を/区切りで含む) */
	path: string;
};

/** フォルダ配下の収集に使う状態 */
type CollectContext = {
	/** 対象アカウントのアプリ内ID */
	accountId: string;
	/** 親キーごとの子フォルダ一覧 */
	byParent: Record<string, FolderRecord[]>;
	/** フォルダIDごとのフォルダ */
	byId: Record<string, FolderRecord>;
};

/** ファイルを取得する関数(テスト用に差し替え可能) */
type FetchLike = (url: string) => Promise<Response>;

/** 取得したBlobを保存する関数(テスト用に差し替え可能) */
type SaveLike = (blob: Blob, name: string) => void;

/**
 * 2桁のゼロ埋め
 * @param value - 数値
 * @returns 2桁の文字列
 */
const pad2 = (value: number) => String(value).padStart(2, '0');

/**
 * フォルダ配下のファイルを経路付きで再帰的に集める
 * @param context - 収集に使う状態
 * @param folderId - 対象のフォルダID
 * @param basePath - このフォルダが属する経路(末尾は/)
 * @returns ダウンロードする1件の一覧
 */
const collectFolder = async (
	context: CollectContext,
	folderId: string,
	basePath: string,
): Promise<DownloadEntryShape[]> => {
	const folder = context.byId[folderId];
	if (folder === undefined) {
		return [];
	}

	const path = `${basePath}${folder.name}/`;
	const files = await listFilesInFolder(context.accountId, folderId);
	const own = files.map((file) => ({ file, path: `${path}${file.name}` }));
	const children = context.byParent[folderId] ?? [];
	const nested = await Promise.all(
		children.map((child) => collectFolder(context, child.id, path)),
	);
	return [...own, ...nested.flat()];
};

/**
 * 項目1件をダウンロードする1件の一覧へ展開する
 * @param context - 収集に使う状態
 * @param item - 対象の項目
 * @returns ダウンロードする1件の一覧
 */
const collectItem = async (
	context: CollectContext,
	item: DriveItem,
): Promise<DownloadEntryShape[]> => {
	if (item.kind === 'folder') {
		return collectFolder(context, item.id, '');
	}

	const file = await getCachedFile(context.accountId, item.id);
	return file === undefined ? [] : [{ file, path: file.name }];
};

/**
 * 同じ経路に「 (n)」を付けて区別する(拡張子の前に付ける)
 * @param path - 元の経路
 * @param count - 何個目か(2以上)
 * @returns 番号付きの経路
 */
const numberedPath = (path: string, count: number) => {
	const dot = path.lastIndexOf('.');
	const slash = path.lastIndexOf('/');
	if (dot <= slash + 1) {
		return `${path} (${count})`;
	}

	return `${path.slice(0, dot)} (${count})${path.slice(dot)}`;
};

/**
 * zip内で経路が重複しないように番号を付ける(Misskeyは同名ファイルを許すため)
 * @param entries - ダウンロードする1件の一覧
 * @returns 経路を一意にした一覧
 */
const uniquePaths = (entries: DownloadEntryShape[]) => {
	const seen: Record<string, number> = {};
	return entries.map((entry) => {
		const count = (seen[entry.path] ?? 0) + 1;
		seen[entry.path] = count;
		return count === 1 ? entry : { ...entry, path: numberedPath(entry.path, count) };
	});
};

/**
 * Retry-Afterヘッダーの値(秒)をミリ秒へ変換する
 * @param value - ヘッダーの値
 * @returns 待機時間(ミリ秒)。解釈できない場合はnull
 */
const parseRetryAfterMs = (value: string | null) => {
	const seconds = value === null ? Number.NaN : Number(value);
	return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
};

/**
 * ファイルを1件取得する(429はレートリミッターへ再試行を委ね、その他の失敗はエラーにする)
 * @param fetchImpl - 取得関数
 * @param entry - 取得する1件
 * @returns レスポンス
 * @throws {RateLimitError} 429応答を受け取った場合
 * @throws {Error} 取得に失敗した場合
 */
const fetchEntry = async (fetchImpl: FetchLike, entry: DownloadEntryShape) => {
	const response = await fetchImpl(entry.file.url);
	if (response.status === 429) {
		throw new RateLimitError(parseRetryAfterMs(response.headers.get('Retry-After')));
	}

	if (!response.ok) {
		throw new Error(`${entry.file.name}を取得できませんでした(${response.status})`);
	}

	return response;
};

/**
 * zipへ順に流し込む入力を作る(取得は1件ずつ行い、進捗を通知する)
 * @param entries - ダウンロードする1件の一覧
 * @param fetchOne - レート制御付きの取得関数
 * @param onProgress - 進捗通知
 * @returns client-zipへ渡す非同期イテラブル
 */
const zipInputs = (
	entries: DownloadEntryShape[],
	fetchOne: (entry: DownloadEntryShape) => Promise<Response>,
	onProgress?: (done: number, total: number) => void,
) => ({
	async *[Symbol.asyncIterator]() {
		for (const [index, entry] of entries.entries()) {
			// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次取得
			const response = await fetchOne(entry);
			yield {
				name: entry.path,
				input: response,
				lastModified: new Date(entry.file.createdAt),
			};
			onProgress?.(index + 1, entries.length);
		}
	},
});

/**
 * 1件だけをそのまま取得する
 * @param entry - ダウンロードする1件
 * @param fetchOne - レート制御付きの取得関数
 * @returns 保存する内容と名前
 */
const downloadSingle = async (
	entry: DownloadEntryShape,
	fetchOne: (entry: DownloadEntryShape) => Promise<Response>,
) => {
	const response = await fetchOne(entry);
	return { blob: await response.blob(), name: entry.file.name };
};

/**
 * 複数件をフォルダ構造を保ったzipにまとめる
 * @param input - ダウンロードする一覧、zip名、進捗通知
 * @param fetchOne - レート制御付きの取得関数
 * @returns 保存する内容と名前
 */
const downloadAsZip = async (
	input: {
		/** ダウンロードする1件の一覧 */
		entries: DownloadEntryShape[];
		/** zipファイル名(拡張子なし) */
		zipName: string;
		/** 進捗通知 */
		onProgress?: (done: number, total: number) => void;
	},
	fetchOne: (entry: DownloadEntryShape) => Promise<Response>,
) => {
	const zip = downloadZip(zipInputs(input.entries, fetchOne, input.onProgress));
	return { blob: await zip.blob(), name: `${input.zipName}.zip` };
};

/** ダウンロードする1件(zip内の経路付き) */
export type DownloadEntry = DownloadEntryShape;

/**
 * 選択項目をダウンロードする1件の一覧へ展開する(フォルダは配下を再帰的に含め、経路を一意にする)
 * @param accountId - 対象アカウントのアプリ内ID
 * @param items - 選択項目
 * @returns ダウンロードする1件の一覧
 */
export const collectDownloadEntries = async (accountId: string, items: DriveItem[]) => {
	const folders = await listAccountFolders(accountId);
	const context: CollectContext = {
		accountId,
		byParent: buildChildrenMap(folders),
		byId: Object.fromEntries(folders.map((folder) => [folder.id, folder])),
	};
	const collected = await Promise.all(items.map((item) => collectItem(context, item)));
	return uniquePaths(collected.flat());
};

/**
 * 既定のzipファイル名(拡張子なし)を日時から作る
 * @param now - 基準の日時
 * @returns drive-YYYYMMDD-HHmmss形式の名前
 */
export const defaultZipName = (now: Date) =>
	`drive-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;

/**
 * ファイルを取得して保存する
 * ファイル1件の選択ならそのまま保存し、それ以外はフォルダ構造を保ったzipにまとめる。取得はレート制御付きで1件ずつ行う
 * @param input - ダウンロードする一覧、zip名、進捗通知、取得・保存の差し替え
 */
export const downloadEntries = async (input: {
	/** ダウンロードする1件の一覧 */
	entries: DownloadEntry[];
	/** zipファイル名(拡張子なし) */
	zipName: string;
	/** trueなら1件でもzipにまとめる(フォルダを選んだ時など) */
	forceZip?: boolean;
	/** 1件取得するごとに呼ぶ進捗通知(完了件数, 全件数) */
	onProgress?: (done: number, total: number) => void;
	/** 取得関数(テスト用に差し替え可能) */
	fetchImpl?: FetchLike;
	/** 保存関数(テスト用に差し替え可能) */
	save?: SaveLike;
}) => {
	const fetchImpl = input.fetchImpl ?? ((url: string) => fetch(url));
	const limiter = createRateLimiter();
	const fetchOne = (entry: DownloadEntry) => limiter.schedule(() => fetchEntry(fetchImpl, entry));
	input.onProgress?.(0, input.entries.length);

	const [single] = input.entries;
	const result =
		input.entries.length === 1 && single !== undefined && input.forceZip !== true
			? await downloadSingle(single, fetchOne)
			: await downloadAsZip(input, fetchOne);
	(input.save ?? saveBlob)(result.blob, result.name);
};
