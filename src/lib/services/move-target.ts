import type { DriveItem } from './drive-actions';
import type { FolderRecord } from '../db/schema';

/**
 * 移動対象のフォルダとその子孫のIDを集める(移動先にできないフォルダ)
 * @param childrenMap - 親キーごとの子フォルダ一覧
 * @param items - 移動する項目
 * @returns 移動先にできないフォルダIDの集合
 */
const collectForbiddenFolders = (
	childrenMap: Record<string, FolderRecord[]>,
	items: DriveItem[],
) => {
	const forbidden = new Set<string>();

	const stack = items.filter((item) => item.kind === 'folder').map((item) => item.id);
	while (stack.length > 0) {
		const id = stack.pop();
		if (id !== undefined && !forbidden.has(id)) {
			forbidden.add(id);

			for (const child of childrenMap[id] ?? []) {
				stack.push(child.id);
			}
		}
	}

	return forbidden;
};

/**
 * 移動先として選べるかどうか
 * 表示中のフォルダ(移動しても変わらない)と、移動対象のフォルダ自身およびその子孫は選べない
 * @param input - 子フォルダ一覧、移動する項目、表示中のフォルダ、移動先の候補
 * @returns 選べるならtrue
 */
export const isMoveTargetAllowed = (input: {
	/** 親キーごとの子フォルダ一覧 */
	childrenMap: Record<string, FolderRecord[]>;
	/** 移動する項目 */
	items: DriveItem[];
	/** 表示中のフォルダID(ルートはnull) */
	currentFolderId: string | null;
	/** 移動先の候補のフォルダID(ルートはnull) */
	targetFolderId: string | null;
}) => {
	if (input.targetFolderId === input.currentFolderId) {
		return false;
	}

	if (input.targetFolderId === null) {
		return true;
	}

	return !collectForbiddenFolders(input.childrenMap, input.items).has(input.targetFolderId);
};
