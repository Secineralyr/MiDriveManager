import {
	IDENTITY,
	clampScale,
	clampTranslate,
	distanceBetween,
	zoomAround,
} from '../../lib/utils/zoom-math';
import { describe, expect, it } from 'vitest';

describe('拡大縮小の計算', () => {
	it('拡大率は等倍から5倍の範囲に収まる', () => {
		expect(clampScale(0.5)).toBe(1);
		expect(clampScale(3)).toBe(3);
		expect(clampScale(9)).toBe(5);
	});

	it('指定した点を固定したまま拡大する(固定点の画面上の位置が変わらない)', () => {
		const anchor = { x: 50, y: 20 };
		const zoomed = zoomAround(IDENTITY, anchor, 2);
		expect(zoomed).toStrictEqual({ scale: 2, x: -50, y: -20 });

		// 等倍時に固定点にあった画像上の位置(50, 20)は、拡大後も translate + 位置 * scale = 固定点になる
		expect(zoomed.x + 50 * zoomed.scale).toBe(anchor.x);
		expect(zoomed.y + 20 * zoomed.scale).toBe(anchor.y);
	});

	it('拡大した状態からさらに拡大しても固定点は変わらない', () => {
		const first = zoomAround(IDENTITY, { x: 50, y: 20 }, 2);
		const second = zoomAround(first, { x: -30, y: 10 }, 4);
		// 2倍時に(-30, 10)にあった画像上の位置は ((-30 - first.x) / 2, (10 - first.y) / 2)
		const local = { x: (-30 - first.x) / 2, y: (10 - first.y) / 2 };
		expect(second.scale).toBe(4);
		expect(second.x + local.x * 4).toBeCloseTo(-30);
		expect(second.y + local.y * 4).toBeCloseTo(10);
	});
});

describe('移動量の制限', () => {
	it('拡大した画像がはみ出す分までしか動かせず、表示領域より小さい軸は中央に戻る', () => {
		const bounds = { viewWidth: 100, viewHeight: 100, contentWidth: 200, contentHeight: 40 };
		const clamped = clampTranslate({ scale: 2, x: 500, y: -30 }, bounds);
		expect(clamped).toStrictEqual({ scale: 2, x: 150, y: 0 });

		const inside = clampTranslate({ scale: 2, x: -120, y: 0 }, bounds);
		expect(inside.x).toBe(-120);
	});

	it('2点間の距離を求める', () => {
		expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
	});
});
