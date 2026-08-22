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
