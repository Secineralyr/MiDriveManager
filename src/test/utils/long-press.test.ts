import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { longPress } from '../../lib/utils/long-press';

/** 長押しで渡される座標 */
type Position = {
	/** ビューポート基準のx座標 */
	x: number;
	/** ビューポート基準のy座標 */
	y: number;
};

/**
 * 長押し対象の要素と受け取った座標の記録を用意する
 * @returns 要素と座標の記録
 */
const setup = () => {
	const positions: Position[] = [];
	const node = document.createElement('div');
	document.body.append(node);
	longPress(node, (position) => {
		positions.push(position);
	});
	return { node, positions };
};

/**
 * ポインターイベントを発火する
 * @param node - 対象の要素
 * @param type - イベントの種類
 * @param position - 発火する座標
 */
const firePointer = (node: HTMLElement, type: string, position: Position) => {
	node.dispatchEvent(
		new MouseEvent(type, { clientX: position.x, clientY: position.y, bubbles: true }),
	);
};

describe('長押しの判定', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		document.body.replaceChildren();
	});

	it('500ms押し続けると押し始めの座標で発火する', () => {
		const { node, positions } = setup();
		firePointer(node, 'pointerdown', { x: 10, y: 20 });
		vi.advanceTimersByTime(500);
		expect(positions).toStrictEqual([{ x: 10, y: 20 }]);
	});

	it('途中で離すと発火しない', () => {
		const { node, positions } = setup();
		firePointer(node, 'pointerdown', { x: 10, y: 20 });
		vi.advanceTimersByTime(300);
		firePointer(node, 'pointerup', { x: 10, y: 20 });
		vi.advanceTimersByTime(500);
		expect(positions).toStrictEqual([]);
	});

	it('大きく動かすと発火しない(スクロール操作とみなす)', () => {
		const { node, positions } = setup();
		firePointer(node, 'pointerdown', { x: 10, y: 20 });
		firePointer(node, 'pointermove', { x: 10, y: 40 });
		vi.advanceTimersByTime(500);
		expect(positions).toStrictEqual([]);
	});

	it('ドラッグが始まると発火しない', () => {
		const { node, positions } = setup();
		firePointer(node, 'pointerdown', { x: 10, y: 20 });
		node.dispatchEvent(new Event('dragstart', { bubbles: true }));
		vi.advanceTimersByTime(500);
		expect(positions).toStrictEqual([]);
	});
});

describe('長押し後のクリック抑止', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		document.body.replaceChildren();
	});

	it('発火直後のクリックは伝播させず、次のクリックは通す', () => {
		const { node } = setup();
		let clicks = 0;
		document.body.addEventListener('click', () => {
			clicks += 1;
		});
		firePointer(node, 'pointerdown', { x: 10, y: 20 });
		vi.advanceTimersByTime(500);
		firePointer(node, 'click', { x: 10, y: 20 });
		expect(clicks).toBe(0);

		firePointer(node, 'click', { x: 10, y: 20 });
		expect(clicks).toBe(1);
	});
});
