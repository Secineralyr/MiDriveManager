import type { DriveItem } from './drive-actions';

/** コンテキストメニューの操作 */
type MenuActionShape = 'download' | 'copy' | 'cut' | 'rename' | 'delete';

/** コンテキストメニューの項目 */
type MenuItemShape = {
	/** 操作の識別子 */
	id: MenuActionShape;
	/** 表示名 */
	label: string;
	/** 破壊的な操作かどうか(危険色で表示する) */
	danger?: boolean;
	/** 選べない状態かどうか */
	disabled?: boolean;
};

/** コンテキストメニューの操作 */
export type MenuAction = MenuActionShape;

/** コンテキストメニューの項目 */
export type MenuItem = MenuItemShape;

/**
 * 選択中の項目に応じたコンテキストメニューの項目を組み立てる
 * フォルダを含む場合はコピー(複製)を出さず、名前の変更は1件選択の時だけ選べる
 * @param items - 選択中の項目
 * @returns メニューの項目
 */
export const buildSelectionMenu = (items: DriveItem[]): MenuItem[] => {
	const hasFolder = items.some((item) => item.kind === 'folder');
	const copy: MenuItem[] = hasFolder ? [] : [{ id: 'copy', label: 'コピー' }];
	return [
		{ id: 'download', label: 'ダウンロード' },
		...copy,
		{ id: 'cut', label: '切り取り' },
		{ id: 'rename', label: '名前の変更', disabled: items.length !== 1 },
		{ id: 'delete', label: '削除', danger: true },
	];
};
