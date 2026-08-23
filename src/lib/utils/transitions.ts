import type { TransitionConfig } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

/** 出入りの時間(ミリ秒) */
const DURATION_MS = 250;

/** 縮小状態の倍率 */
const START_SCALE = 0.9;

/** 縮小状態のブラー量(px) */
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
