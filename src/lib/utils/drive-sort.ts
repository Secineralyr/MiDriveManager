import type { FileRecord, FolderRecord } from '../db/schema';

/** 名前の比較に使う照合器(日本語) */
const collator = new Intl.Collator('ja');

/** 並び替えの基準 */
type SortKeyShape = 'name' | 'createdAt' | 'size';

/** 並び替えの方向 */
type SortOrderShape = 'asc' | 'desc';

/**
 * 比較結果を並び順に合わせて反転する
 * @param result - 昇順での比較結果
 * @param order - 並び替えの方向
 * @returns 方向を反映した比較結果
 */
const applyOrder = (result: number, order: SortOrderShape) => (order === 'asc' ? result : -result);

/**
 * ファイル同士を昇順で比較する
 * @param a - 比較対象1
 * @param b - 比較対象2
 * @param key - 並び替えの基準
 * @returns 比較結果
 */
const compareFiles = (a: FileRecord, b: FileRecord, key: SortKeyShape) => {
	if (key === 'name') {
		return collator.compare(a.name, b.name);
	}
	if (key === 'size') {
		return a.size - b.size;
	}
	return a.createdAt.localeCompare(b.createdAt);
};

/** 並び替えの基準 */
export type SortKey = SortKeyShape;

/** 並び替えの方向 */
export type SortOrder = SortOrderShape;

/**
 * フォルダを並び替える(sizeはフォルダにないため名前順として扱う)
 * @param folders - 並び替えるフォルダ
 * @param key - 並び替えの基準
 * @param order - 並び替えの方向
 * @returns 並び替え済みの新しい配列
 */
export const sortFolders = (folders: FolderRecord[], key: SortKey, order: SortOrder) => {
	const effectiveKey = key === 'size' ? 'name' : key;
	return folders.toSorted((a, b) =>
		applyOrder(
			effectiveKey === 'name'
				? collator.compare(a.name, b.name)
				: a.createdAt.localeCompare(b.createdAt),
			order,
		),
	);
};

/**
 * ファイルを並び替える
 * @param files - 並び替えるファイル
 * @param key - 並び替えの基準
 * @param order - 並び替えの方向
 * @returns 並び替え済みの新しい配列
 */
export const sortFiles = (files: FileRecord[], key: SortKey, order: SortOrder) =>
	files.toSorted((a, b) => applyOrder(compareFiles(a, b, key), order));
