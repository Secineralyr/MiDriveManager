import { getThemeMode, setThemeMode } from '../db/settings';
import type { ThemeMode } from '../db/settings';

/** テーマの状態 */
type ThemeState = {
	/** 現在のテーマの選択 */
	mode: ThemeMode;
};

const state = $state<ThemeState>({ mode: 'system' });

const THEME_COLORS = { dark: '#1f1f1f', light: '#f2f2f2' } as const;

const THEME_MODE_STORAGE_KEY = 'mdm:theme-mode';

/**
 * theme-colorメタタグへテーマの選択を反映する
 * メタタグはOS設定(prefers-color-scheme)にしか追従しないため、手動選択では両方を選んだ色にし、
 * systemでは既定(media指定なし=ダーク、media指定あり=ライト)へ戻す
 * @param mode - テーマの選択
 */
const applyThemeColor = (mode: ThemeMode) => {
	const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
	for (const meta of metas) {
		const scheme = (meta.getAttribute('media') ?? '') === '' ? 'dark' : 'light';
		meta.content = mode === 'system' ? THEME_COLORS[scheme] : THEME_COLORS[mode];
	}
};

/**
 * テーマの選択をlocalStorageへ写す(index.htmlの起動スクリプトが初回描画前の背景色決定に使う)
 * @param mode - テーマの選択
 */
const mirrorThemeMode = (mode: ThemeMode) => {
	try {
		localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
	} catch {
		// localStorageが動かない環境は諦める
	}
};

/**
 * テーマの選択をドキュメントへ反映する(systemは属性を外してOS設定に従う)
 * @param mode - テーマの選択
 */
const applyTheme = (mode: ThemeMode) => {
	const root = document.documentElement;

	// 残るとCSSのテーマ切替に勝ってしまうので
	// 起動スクリプトが初回描画用に付けた背景色を削除する
	document.body.style.removeProperty('background-color');

	applyThemeColor(mode);
	if (mode === 'system') {
		// oxlint-disable-next-line unicorn/prefer-dom-node-dataset - datasetの削除はdelete演算子が必要なためremoveAttributeを使う
		root.removeAttribute('data-theme');
		return;
	}

	root.dataset.theme = mode;
};

/**
 * View Transitionの完了を静かに待つ(遷移自体の失敗は無視する。テーマの反映はコールバックで完了している)
 * @param transition - 待つ遷移
 */
const waitTransitionQuietly = async (transition: ViewTransition) => {
	try {
		await transition.finished;
	} catch {
		// 遷移の中断・失敗はテーマ反映へ影響しないため握りつぶす
	}
};

/**
 * テーマ切替の遷移の完了を待って切替中の印を外し、追加の遷移で再サンプルの機会を増やす
 * @param transition - テーマ切替の遷移
 */
const finishThemeTransition = async (transition: ViewTransition) => {
	await waitTransitionQuietly(transition);
	// oxlint-disable-next-line unicorn/prefer-dom-node-dataset - datasetの削除はdelete演算子が必要なためremoveAttributeを使う
	document.documentElement.removeAttribute('data-theme-changing');
};

/**
 * テーマの選択をView Transitionで包んでドキュメントへ反映する
 * (iOSのステータスバーが色を読み直す機会が増える(確実ではない)ほか、切替がクロスフェードになる。
 * 使えない環境・失敗時はそのまま反映する)
 * @param mode - テーマの選択
 */
const applyThemeWithTransition = (mode: ThemeMode) => {
	if (typeof document.startViewTransition !== 'function') {
		applyTheme(mode);
		return;
	}

	const root = document.documentElement;

	try {
		// 切替中の印を付け、CSS側のクロスフェードを有効にする
		root.dataset.themeChanging = '';
		const transition = document.startViewTransition(() => {
			applyTheme(mode);
		});
		const _ = finishThemeTransition(transition);
	} catch {
		// View Transitionを開始できない状態ではそのまま反映する
		// oxlint-disable-next-line unicorn/prefer-dom-node-dataset - datasetの削除はdelete演算子が必要なためremoveAttributeを使う
		root.removeAttribute('data-theme-changing');
		applyTheme(mode);
	}
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
		mirrorThemeMode(state.mode);
		applyTheme(state.mode);
	},

	/**
	 * テーマの選択を変更して保存する
	 * @param mode - テーマの選択
	 */
	async set(mode: ThemeMode) {
		state.mode = mode;
		mirrorThemeMode(mode);
		applyThemeWithTransition(mode);
		await setThemeMode(mode);
	},
};
