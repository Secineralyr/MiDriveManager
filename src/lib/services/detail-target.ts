import type { FileRecord, FolderRecord } from '../db/schema';
import type { DriveItem } from './drive-actions';

/** 詳細パネルの表示対象 */
type DetailTargetShape =
	| {
			/** 対象の種別 */
			kind: 'file';
			/** 対象のファイル */
			file: FileRecord;
	  }
	| {
			/** 対象の種別 */
			kind: 'folder';
			/** 対象のフォルダ */
			folder: FolderRecord;
	  };

/** 詳細パネルの表示対象 */
export type DetailTarget = DetailTargetShape;

/**
 * 最後に選択した項目から、詳細パネルの表示対象を解決する
 * @param input - 最後に選択した項目と、表示中フォルダ直下のフォルダ・ファイル
 * @returns 表示対象。選択がないか、一覧に存在しなければnull
 */
export const resolveDetailTarget = (input: {
	/** 最後に選択した項目(選択がなければnull) */
	last: DriveItem | null;
	/** 表示中フォルダ直下のフォルダ */
	folders: FolderRecord[];
	/** 表示中フォルダ直下のファイル */
	files: FileRecord[];
}): DetailTarget | null => {
	const item = input.last;
	if (item === null) {
		return null;
	}

	if (item.kind === 'folder') {
		const folder = input.folders.find((candidate) => candidate.id === item.id);
		return folder === undefined ? null : { kind: 'folder', folder };
	}

	const file = input.files.find((candidate) => candidate.id === item.id);
	return file === undefined ? null : { kind: 'file', file };
};

/**
 * 表示対象の名前を返す(リネームの初期値用)
 * @param target - 表示対象
 * @returns 名前。対象がなければ空文字
 */
export const detailTargetName = (target: DetailTarget | null) => {
	if (target === null) {
		return '';
	}

	return target.kind === 'file' ? target.file.name : target.folder.name;
};

/**
 * 表示対象を操作対象の項目(種別とID)へ変換する
 * @param target - 表示対象
 * @returns 項目。対象がなければnull
 */
export const detailTargetItem = (target: DetailTarget | null): DriveItem | null => {
	if (target === null) {
		return null;
	}

	return target.kind === 'file'
		? { kind: 'file', id: target.file.id }
		: { kind: 'folder', id: target.folder.id };
};
