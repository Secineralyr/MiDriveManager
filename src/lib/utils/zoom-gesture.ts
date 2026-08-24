import { IDENTITY, distanceBetween, midpoint, zoomAround } from './zoom-math';
import type { GestureState } from './zoom-state';
import type { Point } from './zoom-math';
import { commitTransform } from './zoom-state';

const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 30;

const TAP_TOLERANCE_PX = 10;

// ホイール1段階の倍率
const WHEEL_FACTOR = 1.1;

/**
 * ポインターの位置を表示領域の中心からの相対座標にする
 * @param node - 表示領域の要素
 * @param event - ポインターまたはホイールのイベント
 * @returns 相対座標
 */
const toLocal = (node: HTMLElement, event: MouseEvent): Point => {
	const rect = node.getBoundingClientRect();
	return {
		x: event.clientX - (rect.left + rect.width / 2),
		y: event.clientY - (rect.top + rect.height / 2),
	};
};

/**
 * 2本目の指でピンチを開始する
 * @param state - 内部状態
 * @param points - 押されている2点
 */
const beginPinch = (state: GestureState, points: Point[]) => {
	const [a, b] = points;
	if (a === undefined || b === undefined) {
		return;
	}

	state.pinch = { distance: distanceBetween(a, b), transform: state.transform };
	state.last = midpoint(a, b);
	state.pinched = true;
};

/**
 * ピンチ中の2点から拡大率と位置を更新する(中点の移動で位置も動かす)
 * @param state - 内部状態
 */
const movePinch = (state: GestureState) => {
	const [a, b] = [...state.pointers.values()];
	if (a === undefined || b === undefined || state.pinch === null || state.last === null) {
		return;
	}

	const center = midpoint(a, b);
	const scale = (state.pinch.transform.scale * distanceBetween(a, b)) / state.pinch.distance;
	const zoomed = zoomAround(state.transform, center, scale);
	
	state.moved += distanceBetween(center, state.last);
	
	const panned = {
		...zoomed,
		x: zoomed.x + center.x - state.last.x,
		y: zoomed.y + center.y - state.last.y,
	};
	
	state.last = center;

	commitTransform(state, panned, false);
};

/**
 * 1本指のドラッグで拡大中の画像を動かす(等倍では移動量の記録だけ行う)
 * @param state - 内部状態
 * @param point - 現在の位置
 */
const movePan = (state: GestureState, point: Point) => {
	if (state.last === null) {
		return;
	}

	state.moved += distanceBetween(point, state.last);
	const delta = { x: point.x - state.last.x, y: point.y - state.last.y };
	state.last = point;
	if (state.transform.scale > 1) {
		const { transform } = state;
		commitTransform(
			state,
			{ ...transform, x: transform.x + delta.x, y: transform.y + delta.y },
			false,
		);
	}
};

/**
 * タップ(移動のない指離し)を処理する。ダブルタップなら拡大と等倍を切り替える
 * @param state - 内部状態
 * @param point - タップした位置
 * @param time - タップした時刻
 */
const handleTap = (state: GestureState, point: Point, time: number) => {
	const previous = state.lastTap;
	const isDouble =
		previous !== null &&
		time - previous.time < DOUBLE_TAP_MS &&
		distanceBetween(point, previous.point) < DOUBLE_TAP_DISTANCE_PX;
	
	if (isDouble) {
		state.lastTap = null;
		state.suppressClick = true;
		
		const zoomed = zoomAround({ ...IDENTITY }, point, DOUBLE_TAP_SCALE);
		commitTransform(state, state.transform.scale > 1 ? { ...IDENTITY } : zoomed, true);
	} else {
		state.lastTap = { time, point };
	}
};

/**
 * 全ての指が離れた時の後処理(タップ判定、またはドラッグ後の位置の確定)
 * @param state - 内部状態
 * @param point - 最後に離した位置
 * @param time - 離した時刻
 */
const finishGesture = (state: GestureState, point: Point, time: number) => {
	if (state.moved < TAP_TOLERANCE_PX && !state.pinched) {
		handleTap(state, point, time);
		return;
	}

	state.suppressClick = true;
	commitTransform(state, state.transform, true);
};

/**
 * 押し始めを記録し、2本目ならピンチを開始する
 * ポインターキャプチャは使わない(クリックの発生先が表示領域に変わり、画像のタップで閉じてしまうため)
 * @param state - 内部状態
 * @param event - ポインターイベント
 */
export const handlePointerDown = (state: GestureState, event: PointerEvent) => {
	if (state.target === null) {
		return;
	}

	state.pointers.set(event.pointerId, toLocal(state.node, event));
	const points = [...state.pointers.values()];
	if (points.length === 2) {
		beginPinch(state, points);
	} else if (points.length === 1) {
		state.last = points[0] ?? null;
		state.moved = 0;
		state.pinched = false;
	}
};

/**
 * ポインターの移動をピンチまたはドラッグとして処理する
 * @param state - 内部状態
 * @param event - ポインターイベント
 */
export const handlePointerMove = (state: GestureState, event: PointerEvent) => {
	if (!state.pointers.has(event.pointerId)) {
		return;
	}

	const point = toLocal(state.node, event);
	state.pointers.set(event.pointerId, point);
	if (state.pinch === null) {
		movePan(state, point);
	} else {
		movePinch(state);
	}
};

/**
 * 指離し(または表示領域から出た時)でポインターを外し、残りの指やタップの後処理を行う
 * @param state - 内部状態
 * @param event - ポインターイベント
 */
export const handlePointerUp = (state: GestureState, event: PointerEvent) => {
	const point = state.pointers.get(event.pointerId);
	if (point === undefined) {
		return;
	}

	state.pointers.delete(event.pointerId);
	
	const points = [...state.pointers.values()];
	state.pinch = null;
	state.last = points[0] ?? null;
	
	if (points.length === 0) {
		finishGesture(state, point, event.timeStamp);
	}
};

/**
 * ホイールで拡大率を変える(カーソル位置を固定する)
 * @param state - 内部状態
 * @param event - ホイールイベント
 */
export const handleWheel = (state: GestureState, event: WheelEvent) => {
	if (state.target === null) {
		return;
	}
	event.preventDefault();
	
	const factor = event.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
	const next = zoomAround(
		state.transform,
		toLocal(state.node, event),
		state.transform.scale * factor,
	);
	
	commitTransform(state, next, false);
};

/**
 * ドラッグやピンチの直後のクリックを握りつぶす
 * @param state - 内部状態
 * @param event - マウスイベント
 */
export const suppressClickAfterGesture = (state: GestureState, event: MouseEvent) => {
	if (state.suppressClick) {
		state.suppressClick = false;
		event.preventDefault();
		event.stopPropagation();
	}
};
