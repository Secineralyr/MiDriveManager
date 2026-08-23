import type { DriveItem } from '../services/drive-actions';
import type { UploadEntry } from '../services/upload';
import { defaultZipName } from '../services/download';
import { itemName } from './item-name';
import { toastStore } from './toast.svelte';

/**
 * アップロードタスクの表示名を作る
 * @param entries - アップロード対象の一覧
 * @returns 表示名(1件ならファイル名、複数なら件数)
 */
export const uploadLabel = (entries: UploadEntry[]) => {
	const [first] = entries;
	if (entries.length === 1 && first !== undefined) {
		return `${first.file.name}をアップロード`;
	}

	return `${entries.length}件のアップロード`;
};

/**
 * ダウンロードタスクの表示名を作る
 * @param items - ダウンロードする項目
 * @returns 表示名(1件なら名前、複数なら件数)
 */
export const downloadLabel = (items: DriveItem[]) => {
	const [first] = items;
	const name = items.length === 1 && first !== undefined ? itemName(first) : undefined;
	return name === undefined ? `${items.length}件のダウンロード` : `${name}をダウンロード`;
};

/**
 * zipファイル名(拡張子なし)を決める(フォルダ1件ならその名前、それ以外は日時)
 * @param items - ダウンロードする項目
 * @returns zipファイル名
 */
export const zipNameFor = (items: DriveItem[]) => {
	const [first] = items;
	const folderName = items.length === 1 && first?.kind === 'folder' ? itemName(first) : undefined;
	return folderName ?? defaultZipName(new Date());
};

/**
 * 既存のファイルが返された件数をトーストで知らせる
 * @param count - 既存のファイルが返された件数
 */
export const notifyExisting = (count: number) => {
	if (count === 0) {
		return;
	}

	toastStore.show({
		kind: 'info',
		message: `${count}件は同じ内容のファイルが既にあるため、既存のファイルをそのまま使用しました`,
	});
};
