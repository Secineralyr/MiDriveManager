import type { FolderRecord } from '../db/schema';

/** 名前の比較に使う照合器(日本語) */
const collator = new Intl.Collator('ja');

/**
 * フォルダをIDで引ける索引を作る
 * @param folders - 全フォルダ
 * @returns IDごとのフォルダ
 */
const indexById = (folders: FolderRecord[]) => {
	const byId: Record<string, FolderRecord> = {};
	for (const folder of folders) {
		byId[folder.id] = folder;
	}
	return byId;
};

/** 経路構築の作業状態 */
type PathWalk = {
	/** IDごとのフォルダ */
	byId: Record<string, FolderRecord>;
	/** 訪問済みのフォルダID(循環対策) */
	visited: Set<string>;
	/** 構築中の経路 */
	path: FolderRecord[];
};

/**
 * 1階層分だけ親へ辿り、経路の先頭に追加する
 * @param walk - 経路構築の作業状態
 * @param cursor - 現在のフォルダID
 * @returns 次に辿る親フォルダID。辿れない場合はnull
 */
const stepToParent = (walk: PathWalk, cursor: string): string | null => {
	const folder = walk.byId[cursor];
	if (folder === undefined || walk.visited.has(cursor)) {
		return null;
	}

	walk.visited.add(cursor);
	walk.path.unshift(folder);
	return folder.parentId;
};

/**
 * 子フォルダ一覧からフォルダIDごとの親IDを引ける索引を作る
 * @param childrenMap - 親キーごとの子フォルダ一覧
 * @returns フォルダIDごとの親フォルダID
 */
const parentIdIndex = (childrenMap: Record<string, FolderRecord[]>) => {
	const parentOf: Record<string, string | null> = {};
	for (const bucket of Object.values(childrenMap)) {
		for (const folder of bucket) {
			parentOf[folder.id] = folder.parentId;
		}
	}

	return parentOf;
};

/**
 * フォルダ一覧から親キーごとの子フォルダ一覧を作る
 * キーはルート直下が空文字列、それ以外は親フォルダID。各一覧は名前順に並ぶ
 * @param folders - 全フォルダ
 * @returns 親キーごとの子フォルダ一覧
 */
export const buildChildrenMap = (folders: FolderRecord[]) => {
	const map: Record<string, FolderRecord[]> = {};
	for (const folder of folders) {
		const bucket = map[folder.parentKey];
		if (bucket === undefined) {
			map[folder.parentKey] = [folder];
		} else {
			bucket.push(folder);
		}
	}

	for (const bucket of Object.values(map)) {
		bucket.sort((a, b) => collator.compare(a.name, b.name));
	}

	return map;
};

/**
 * ルートから指定フォルダまでの経路を作る
 * @param folders - 全フォルダ
 * @param folderId - 対象フォルダID(nullはルート)
 * @returns ルート直下から対象フォルダまでのフォルダ列。親を辿れない場合は辿れた範囲まで
 */
export const folderPath = (folders: FolderRecord[], folderId: string | null) => {
	const walk: PathWalk = { byId: indexById(folders), visited: new Set<string>(), path: [] };
	let cursor = folderId;
	while (cursor !== null) {
		cursor = stepToParent(walk, cursor);
	}

	return walk.path;
};

/**
 * 指定フォルダの祖先フォルダID(ルート側から順)を返す
 * ツリーで現在のフォルダを見えるようにするための自動展開に使う
 * @param childrenMap - 親キーごとの子フォルダ一覧
 * @param folderId - 対象フォルダID(nullはルート)
 * @returns 祖先フォルダIDの配列(対象自身は含まない。親を辿れない場合は辿れた範囲まで)
 */
export const ancestorIds = (
	childrenMap: Record<string, FolderRecord[]>,
	folderId: string | null,
) => {
	const parentOf = parentIdIndex(childrenMap);
	const path: string[] = [];
	const visited = new Set<string>();
	let cursor = folderId === null ? null : (parentOf[folderId] ?? null);
	while (cursor !== null && !visited.has(cursor)) {
		visited.add(cursor);
		path.unshift(cursor);
		cursor = parentOf[cursor] ?? null;
	}

	return path;
};

/**
 * 子フォルダ一覧の索引からフォルダを探す
 * @param childrenMap - 親キーごとの子フォルダ一覧
 * @param folderId - 探すフォルダID
 * @returns 見つかったフォルダ。なければnull
 */
export const findFolder = (childrenMap: Record<string, FolderRecord[]>, folderId: string) => {
	for (const bucket of Object.values(childrenMap)) {
		const hit = bucket.find((folder) => folder.id === folderId);
		if (hit !== undefined) {
			return hit;
		}
	}

	return null;
};
