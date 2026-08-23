/** 選択操作の修飾キー */
type SelectModifiersShape = {
	/** 選択を個別に追加・解除するか(Ctrl/Cmd) */
	toggle: boolean;
	/** 起点からの範囲選択にするか(Shift) */
	range: boolean;
};

/** 選択の状態 */
type SelectionState = {
	/** 選択中のキー(選択した順) */
	keys: string[];
	/** 範囲選択の起点キー */
	anchor: string | null;
};

const state = $state<SelectionState>({
	keys: [],
	anchor: null,
});

/**
 * 表示順のキー列から範囲選択の対象を求める
 * @param orderedKeys - 表示順のキー列
 * @param anchor - 範囲選択の起点キー(なければnull)
 * @param target - 選択先のキー
 * @returns 範囲に含まれるキー列
 */
const rangeBetween = (orderedKeys: string[], anchor: string | null, target: string) => {
	const targetIndex = orderedKeys.indexOf(target);
	if (targetIndex === -1) {
		return [target];
	}

	const anchorIndex = anchor === null ? targetIndex : orderedKeys.indexOf(anchor);
	const effectiveAnchor = anchorIndex === -1 ? targetIndex : anchorIndex;

	const start = Math.min(effectiveAnchor, targetIndex);
	const end = Math.max(effectiveAnchor, targetIndex);
	return orderedKeys.slice(start, end + 1);
};

/**
 * 選択キーの有無を切り替えた新しい配列を作る
 * @param keys - 現在の選択キー
 * @param key - 切り替えるキー
 * @returns 切り替え後の選択キー
 */
const toggleKey = (keys: string[], key: string) =>
	keys.includes(key) ? keys.filter((existing) => existing !== key) : [...keys, key];

/** 選択操作の修飾キー */
export type SelectModifiers = SelectModifiersShape;

/**
 * 種別とIDから選択キーを作る
 * @param kind - 項目の種別
 * @param id - 項目のID
 * @returns 選択キー
 */
export const makeSelectionKey = (kind: 'file' | 'folder', id: string) => `${kind}:${id}`;

/**
 * 選択キーを種別とIDへ分解する
 * @param key - 選択キー
 * @returns 種別とID
 */
export const parseSelectionKey = (key: string): { kind: 'file' | 'folder'; id: string } =>
	key.startsWith('folder:')
		? { kind: 'folder', id: key.slice('folder:'.length) }
		: { kind: 'file', id: key.slice('file:'.length) };

/** ファイル一覧の選択状態を管理するストア */
export const selectionStore = {
	/**
	 * 選択中のキー(選択した順)
	 * @returns キーの配列
	 */
	get keys() {
		return state.keys;
	},

	/**
	 * 選択中の件数
	 * @returns 件数
	 */
	get count() {
		return state.keys.length;
	},

	/**
	 * 最後に選択されたキー
	 * @returns キー。未選択ならnull
	 */
	get last() {
		return state.keys.at(-1) ?? null;
	},

	/**
	 * キーが選択されているかどうか
	 * @param key - 判定するキー
	 * @returns 選択中ならtrue
	 */
	isSelected(key: string) {
		return state.keys.includes(key);
	},

	/**
	 * クリック操作による選択を反映する
	 * 修飾キーなしは単独選択、toggleは個別の追加・解除、rangeは起点からの範囲選択になる
	 * @param key - 操作対象のキー
	 * @param modifiers - 修飾キーの状態
	 * @param orderedKeys - 表示順の全キー列(範囲選択に使う)
	 */
	click(key: string, modifiers: SelectModifiers, orderedKeys: string[]) {
		if (modifiers.range) {
			state.keys = rangeBetween(orderedKeys, state.anchor, key);
			state.anchor ??= key;
			return;
		}

		if (modifiers.toggle) {
			state.keys = toggleKey(state.keys, key);
			state.anchor = key;
			return;
		}

		state.keys = [key];
		state.anchor = key;
	},

	/**
	 * すべて選択する
	 * @param orderedKeys - 表示順の全キー列
	 */
	selectAll(orderedKeys: string[]) {
		state.keys = [...orderedKeys];
	},

	/** 選択をすべて解除する */
	clear() {
		state.keys = [];
		state.anchor = null;
	},
};
