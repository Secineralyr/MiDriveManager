import type { FileRecord } from '../db/schema';

/** 前後のファイル(端や不明な場合はnull) */
export type AdjacentFiles = {
	/** 前のファイル */
	prev: FileRecord | null;
	/** 次のファイル */
	next: FileRecord | null;
};

/**
 * 一覧の表示順で現在のファイルの前後を求める
 * @param files - 表示順のファイル一覧
 * @param currentId - 現在表示中のファイルID
 * @returns 前後のファイル(一覧にない場合は両方null)
 */
export const adjacentFiles = (files: FileRecord[], currentId: string): AdjacentFiles => {
	const index = files.findIndex((file) => file.id === currentId);
	if (index === -1) {
		return { prev: null, next: null };
	}

	return {
		prev: files[index - 1] ?? null,
		next: files[index + 1] ?? null,
	};
};
