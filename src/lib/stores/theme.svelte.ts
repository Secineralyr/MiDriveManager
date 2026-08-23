import { getThemeMode, setThemeMode } from '../db/settings';
import type { ThemeMode } from '../db/settings';

/** テーマの状態 */
type ThemeState = {
	/** 現在のテーマの選択 */
	mode: ThemeMode;
};

const state = $state<ThemeState>({ mode: 'system' });

/**
 * テーマの選択をドキュメントへ反映する(systemは属性を外してOS設定に従う)
 * @param mode - テーマの選択
 */
const applyTheme = (mode: ThemeMode) => {
	const root = document.documentElement;
	if (mode === 'system') {
		// oxlint-disable-next-line unicorn/prefer-dom-node-dataset - datasetの削除はdelete演算子(使用禁止)が必要なためremoveAttributeを使う
		root.removeAttribute('data-theme');
		return;
	}

	root.dataset.theme = mode;
};

/** テーマ(システム/ダーク/ライト)を管理するストア */
export const themeStore = {
	/**
	 * 現在のテーマの選択
	 * @returns テーマの選択
	 */
	get mode() {
		return state.mode;
	},

	/** 保存済みのテーマの選択を読み込んで反映する */
	async load() {
		state.mode = await getThemeMode();
		applyTheme(state.mode);
	},

	/**
	 * テーマの選択を変更して保存する
	 * @param mode - テーマの選択
	 */
	async set(mode: ThemeMode) {
		state.mode = mode;
		applyTheme(mode);
		await setThemeMode(mode);
	},
};
