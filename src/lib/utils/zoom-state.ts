import { IDENTITY, clampTranslate } from './zoom-math';
import type { Point, ZoomTransform } from './zoom-math';

const SNAP_SCALE = 1.05;

/** ジェスチャーの内部状態 */
type GestureStateShape = {
	/** 表示領域の要素 */
	node: HTMLElement;
	/** 変換を適用する要素(nullなら無効) */
	target: HTMLElement | null;
	/** 現在の変換 */
	transform: ZoomTransform;
	/** 押されているポインターの位置(pointerIdごと。押した順を保つためMapにする) */
	pointers: Map<number, Point>;
	/** ピンチ開始時の2点間の距離と変換(ピンチ中でなければnull) */
	pinch: {
		/** 開始時の2点間の距離 */
		distance: number;
		/** 開始時の変換 */
		transform: ZoomTransform;
	} | null;
	/** 直前のポインター位置(1本ならその指、2本なら中点) */
	last: Point | null;
	/** 押し始めからの移動量の合計(タップ判定用) */
	moved: number;
	/** 今回の操作でピンチをしたかどうか */
	pinched: boolean;
	/** 直前のタップ(ダブルタップ判定用) */
	lastTap: {
		/** タップした時刻 */
		time: number;
		/** タップした位置 */
		point: Point;
	} | null;
	/** 直後のクリックを握りつぶすかどうか(ドラッグやピンチの指離しがクリック扱いにならないように) */
	suppressClick: boolean;
};

/** ジェスチャーの内部状態 */
export type GestureState = GestureStateShape;

/**
 * ジェスチャーの内部状態を作る
 * @param node - 表示領域の要素
 * @param target - 変換を適用する要素(nullなら無効)
 * @returns 内部状態
 */
export const createGestureState = (
	node: HTMLElement,
	target: HTMLElement | null,
): GestureState => ({
	node,
	target,
	transform: { ...IDENTITY },
	pointers: new Map<number, Point>(),
	pinch: null,
	last: null,
	moved: 0,
	pinched: false,
	lastTap: null,
	suppressClick: false,
});

/**
 * 変換を対象の要素へ適用する
 * @param state - 内部状態
 * @param animate - 変化をアニメーションさせるかどうか(ダブルタップや等倍への戻しで使う)
 */
export const applyTransform = (state: GestureState, animate: boolean) => {
	if (state.target === null) {
		return;
	}

	const { scale, x, y } = state.transform;
	state.target.style.transition = animate ? 'transform 250ms ease' : '';
	state.target.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
};

/**
 * 変換を差し替えて範囲に収め、適用する(ほぼ等倍なら等倍に戻す)
 * @param state - 内部状態
 * @param next - 新しい変換
 * @param animate - アニメーションさせるかどうか
 */
export const commitTransform = (state: GestureState, next: ZoomTransform, animate: boolean) => {
	if (state.target === null) {
		return;
	}

	const clamped = clampTranslate(next, {
		viewWidth: state.node.clientWidth,
		viewHeight: state.node.clientHeight,
		contentWidth: state.target.offsetWidth,
		contentHeight: state.target.offsetHeight,
	});
	state.transform = clamped.scale < SNAP_SCALE ? { ...IDENTITY } : clamped;

	applyTransform(state, animate);
};

/**
 * 対象の要素を差し替え、等倍に戻す
 * @param state - 内部状態
 * @param target - 新しい対象(nullなら無効)
 */
export const resetTarget = (state: GestureState, target: HTMLElement | null) => {
	state.target = target;
	state.transform = { ...IDENTITY };
	state.pointers = new Map<number, Point>();
	state.pinch = null;

	applyTransform(state, false);
};
