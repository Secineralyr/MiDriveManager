import type { DriveItem } from './drive-actions';

/** コンテキストメニューの操作 */
type MenuActionShape = 'details' | 'download' | 'move' | 'rename' | 'delete';

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
 * 名前の変更は1件選択の時だけ選べる
 * (複製はサーバーのハッシュ検証により実質不可のため提供しない。切り取り→貼り付けの移動はショートカットで使える)
 * @param items - 選択中の項目
 * @param options - 追加項目の指定
 * @returns メニューの項目
 */
export const buildSelectionMenu = (
	items: DriveItem[],
	options: {
		/** 詳細の項目を先頭に含めるかどうか(スマートフォンのシート用。1件選択の時だけ選べる) */
		details?: boolean;
	} = {},
): MenuItem[] => {
	const details: MenuItem[] =
		options.details === true
			? [{ id: 'details', label: '詳細', disabled: items.length !== 1 }]
			: [];
	return [
		...details,
		{ id: 'download', label: 'ダウンロード' },
		{ id: 'move', label: '移動' },
		{ id: 'rename', label: '名前の変更', disabled: items.length !== 1 },
		{ id: 'delete', label: '削除', danger: true },
	];
};
