const MIN_SCALE = 1;
const MAX_SCALE = 5;

/** 座標 */
type PointShape = {
	/** x座標 */
	x: number;
	/** y座標 */
	y: number;
};

/** 拡大・移動の状態(画像はtransform-origin中心で、移動量は表示領域の中心からのずれ) */
type ZoomTransformShape = {
	/** 拡大率(1が等倍) */
	scale: number;
	/** 横方向の移動量(px) */
	x: number;
	/** 縦方向の移動量(px) */
	y: number;
};

/** 表示領域と画像(等倍時)の大きさ */
type ZoomBoundsShape = {
	/** 表示領域の幅 */
	viewWidth: number;
	/** 表示領域の高さ */
	viewHeight: number;
	/** 画像の幅(等倍) */
	contentWidth: number;
	/** 画像の高さ(等倍) */
	contentHeight: number;
};

/**
 * 値を±limitの範囲に収める(limitが0なら0にする。-0を避ける)
 * @param value - 値
 * @param limit - 上限(下限は-limit)
 * @returns 収めた値
 */
const clampAxis = (value: number, limit: number) =>
	limit === 0 ? 0 : Math.min(limit, Math.max(-limit, value));

/** 座標 */
export type Point = PointShape;

/** 拡大・移動の状態 */
export type ZoomTransform = ZoomTransformShape;

/** 表示領域と画像の大きさ */
export type ZoomBounds = ZoomBoundsShape;

/** 等倍の状態 */
export const IDENTITY: ZoomTransform = { scale: 1, x: 0, y: 0 };

/**
 * 拡大率を範囲に収める
 * @param scale - 拡大率
 * @returns 収めた拡大率
 */
export const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/**
 * 指定した点を固定したまま拡大率を変える
 * @param current - 現在の状態
 * @param anchor - 固定する点(表示領域の中心からの相対座標)
 * @param nextScale - 新しい拡大率(範囲外は収める)
 * @returns 変更後の状態
 */
export const zoomAround = (
	current: ZoomTransform,
	anchor: Point,
	nextScale: number,
): ZoomTransform => {
	const scale = clampScale(nextScale);
	const ratio = scale / current.scale;
	return {
		scale,
		x: anchor.x - (anchor.x - current.x) * ratio,
		y: anchor.y - (anchor.y - current.y) * ratio,
	};
};

/**
 * 移動量を、画像の端が表示領域の内側へ入り込まない範囲に収める
 * 拡大後も表示領域より小さい軸は中央(0)に戻す
 * @param current - 現在の状態
 * @param bounds - 表示領域と画像の大きさ
 * @returns 収めた状態
 */
export const clampTranslate = (current: ZoomTransform, bounds: ZoomBounds): ZoomTransform => {
	const maxX = Math.max(0, (bounds.contentWidth * current.scale - bounds.viewWidth) / 2);
	const maxY = Math.max(0, (bounds.contentHeight * current.scale - bounds.viewHeight) / 2);
	return { scale: current.scale, x: clampAxis(current.x, maxX), y: clampAxis(current.y, maxY) };
};

/**
 * 2点間の距離
 * @param a - 点
 * @param b - 点
 * @returns 距離
 */
export const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * 2点の中点
 * @param a - 点
 * @param b - 点
 * @returns 中点
 */
export const midpoint = (a: Point, b: Point): Point => ({
	x: (a.x + b.x) / 2,
	y: (a.y + b.y) / 2,
});
