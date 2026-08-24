import type { TransitionConfig } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

const DURATION_MS = 250;

// 縮小倍率
const START_SCALE = 0.9;

// 縮小ブラー量
const START_BLUR_PX = 4;

/**
 * メニューやポップアップの出入りのトランジション
 * ブラーのかかった縮小状態から、拡大しながら不透明度を上げてフェードする
 * 拡大の起点は要素側のtransform-originで指定する
 * @param node - 対象の要素
 * @param params - 時間の上書き
 * @returns トランジションの設定
 */
export const popIn = (
	node: Element,
	params: {
		/** 出入りの時間(ミリ秒) */
		duration?: number;
	} = {},
): TransitionConfig => ({
	duration: params.duration ?? DURATION_MS,
	easing: cubicOut,
	css: (t, u) =>
		`opacity: ${t}; transform: scale(${START_SCALE + (1 - START_SCALE) * t}); filter: blur(${u * START_BLUR_PX}px);`,
});

/**
 * 行内の要素(チェックボックスなど)の出入りのトランジション
 * フェードしながら占有する幅を0から広げ、隣の要素が横へ滑るように動く
 * @param node - 対象の要素
 * @param params - 隣との間隔の補正
 * @returns トランジションの設定
 */
export const revealInline = (
	node: Element,
	params: {
		/** 親のgap(px)。幅が0の間は負のmarginで打ち消す */
		gap?: number;
	} = {},
): TransitionConfig => {
	const { width } = node.getBoundingClientRect();
	const gap = params.gap ?? 0;
	return {
		duration: DURATION_MS,
		easing: cubicOut,
		css: (t, u) => `opacity: ${t}; inline-size: ${t * width}px; margin-right: ${-u * gap}px;`,
	};
};

/**
 * 画面下部のシートの出入りのトランジション
 * 下からスライドして現れ、下へスライドして消える
 * @param _node - 対象の要素(使わない)
 * @returns トランジションの設定
 */
export const sheetUp = (_node: Element): TransitionConfig => ({
	duration: DURATION_MS,
	easing: cubicOut,
	css: (_t, u) => `transform: translateY(${u * 100}%);`,
});

/**
 * 画面右端のドロワーの出入りのトランジション
 * 右からスライドして現れ、右へスライドして消える
 * @param _node - 対象の要素(使わない)
 * @returns トランジションの設定
 */
export const sheetRight = (_node: Element): TransitionConfig => ({
	duration: DURATION_MS,
	easing: cubicOut,
	css: (_t, u) => `transform: translateX(${u * 100}%);`,
});

/**
 * 右端のパネルの出入りのトランジション
 * 右へスライドしながら、負のmargin-rightで占有する幅も一緒に変化させる。
 * 隣の領域はアニメーション中も滑らかに広がる・詰まり、パネルの中身は潰れない
 * @param node - 対象の要素(親側でoverflowを隠すこと)
 * @returns トランジションの設定
 */
export const slidePanel = (node: Element): TransitionConfig => {
	const { width } = node.getBoundingClientRect();
	return {
		duration: DURATION_MS,
		easing: cubicOut,
		css: (t, u) => `margin-right: ${-u * width}px; transform: translateX(${u * width}px);`,
	};
};
