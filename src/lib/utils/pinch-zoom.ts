import { createGestureState, resetTarget } from './zoom-state';
import {
	handlePointerDown,
	handlePointerMove,
	handlePointerUp,
	handleWheel,
	suppressClickAfterGesture,
} from './zoom-gesture';
import type { GestureState } from './zoom-state';

/**
 * ポインター系の監視を登録する
 * @param node - 表示領域の要素
 * @param state - 内部状態
 * @returns 監視を解除する処理
 */
const attachPointer = (node: HTMLElement, state: GestureState) => {
	const down = (event: PointerEvent) => {
		handlePointerDown(state, event);
	};
	const move = (event: PointerEvent) => {
		handlePointerMove(state, event);
	};
	const up = (event: PointerEvent) => {
		handlePointerUp(state, event);
	};

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', up);
	node.addEventListener('pointerleave', up);

	return () => {
		node.removeEventListener('pointerdown', down);
		node.removeEventListener('pointermove', move);
		node.removeEventListener('pointerup', up);
		node.removeEventListener('pointercancel', up);
		node.removeEventListener('pointerleave', up);
	};
};

/**
 * ホイールとクリック抑止の監視を登録する
 * @param node - 表示領域の要素
 * @param state - 内部状態
 * @returns 監視を解除する処理
 */
const attachWheelAndClick = (node: HTMLElement, state: GestureState) => {
	const wheel = (event: WheelEvent) => {
		handleWheel(state, event);
	};
	const click = (event: MouseEvent) => {
		suppressClickAfterGesture(state, event);
	};

	node.addEventListener('wheel', wheel, { passive: false });
	node.addEventListener('click', click, true);

	return () => {
		node.removeEventListener('wheel', wheel);
		node.removeEventListener('click', click, true);
	};
};

/**
 * 表示領域の中の画像をピンチ・ドラッグ・ダブルタップ・ホイールで拡大縮小するSvelteアクション
 * 表示領域の要素に付け、変換を適用する画像の要素を引数に渡す(nullなら無効)
 * @param node - 表示領域の要素(CSSでtouch-action: noneにしておくこと)
 * @param target - 変換を適用する要素
 * @returns アクションの更新・破棄処理
 */
export const pinchZoom = (node: HTMLElement, target: HTMLElement | null) => {
	const state = createGestureState(node, target);
	const detachPointer = attachPointer(node, state);
	const detachWheel = attachWheelAndClick(node, state);

	return {
		/**
		 * 対象の要素を差し替え、等倍に戻す
		 * @param next - 新しい対象(nullなら無効)
		 */
		update(next: HTMLElement | null) {
			resetTarget(state, next);
		},

		/** 監視を解除する */
		destroy() {
			detachPointer();
			detachWheel();
		},
	};
};
