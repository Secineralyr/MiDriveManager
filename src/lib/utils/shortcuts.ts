/** ショートカットに割り当てられた操作 */
type ShortcutActionShape =
	| 'selectAll'
	| 'copy'
	| 'cut'
	| 'paste'
	| 'delete'
	| 'rename'
	| 'clearSelection';

/** Ctrl/Cmd併用時のキーと操作の対応 */
const CTRL_SHORTCUTS: Record<string, ShortcutActionShape> = {
	a: 'selectAll',
	c: 'copy',
	x: 'cut',
	v: 'paste',
};

/** 単独キーと操作の対応 */
const PLAIN_SHORTCUTS: Record<string, ShortcutActionShape> = {
	Delete: 'delete',
	F2: 'rename',
	Escape: 'clearSelection',
};

/** ショートカットに割り当てられた操作 */
export type ShortcutAction = ShortcutActionShape;

/**
 * キー入力からショートカット操作を解決する
 * @param input - 押されたキーとCtrl/Cmdの状態
 * @returns 対応する操作。割り当てがなければnull
 */
export const resolveShortcut = (input: {
	/** 押されたキー(KeyboardEvent.key) */
	key: string;
	/** Ctrl/Cmdが押されているか */
	ctrl: boolean;
}): ShortcutAction | null => {
	if (input.ctrl) {
		return CTRL_SHORTCUTS[input.key.toLowerCase()] ?? null;
	}
	return PLAIN_SHORTCUTS[input.key] ?? null;
};
