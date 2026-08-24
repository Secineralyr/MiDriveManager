import { describe, expect, it } from 'vitest';
import { createPanelResizer } from '../../lib/utils/panel-resize.svelte';

/** 呼び出し回数を数えるためのpreventDefault */
const noop = () => {};

/**
 * 左辺に接するパネルの幅変更を作る(幅180〜480、初期240、刻み10)
 * @returns 幅変更の状態
 */
const createLeftAnchored = () =>
	createPanelResizer({ initial: 240, min: 180, max: 480, step: 10, anchor: 'left' });

describe('パネル幅のドラッグ変更', () => {
	it('開始後はポインターと固定辺の距離が幅になり、終了後は動かない', () => {
		const resizer = createLeftAnchored();
		resizer.start({ clientX: 240, pointerId: 1, currentTarget: null });
		resizer.move({ clientX: 300, pointerId: 1, currentTarget: null }, 100);
		expect(resizer.resizing).toBe(true);
		expect(resizer.width).toBe(200);

		resizer.end();
		resizer.move({ clientX: 400, pointerId: 1, currentTarget: null }, 100);
		expect(resizer.resizing).toBe(false);
		expect(resizer.width).toBe(200);
	});

	it('幅は上下限に収まる', () => {
		const resizer = createLeftAnchored();
		resizer.start({ clientX: 240, pointerId: 1, currentTarget: null });
		resizer.move({ clientX: 1000, pointerId: 1, currentTarget: null }, 0);
		expect(resizer.width).toBe(480);

		resizer.move({ clientX: 10, pointerId: 1, currentTarget: null }, 0);
		expect(resizer.width).toBe(180);
	});

	it('右辺に接するパネルは固定辺から左への距離が幅になる', () => {
		const resizer = createPanelResizer({
			initial: 280,
			min: 240,
			max: 480,
			step: 10,
			anchor: 'right',
		});
		resizer.start({ clientX: 720, pointerId: 1, currentTarget: null });
		resizer.move({ clientX: 700, pointerId: 1, currentTarget: null }, 1000);
		expect(resizer.width).toBe(300);
	});
});

describe('パネル幅のキー操作', () => {
	it('固定辺から離れる向きの矢印キーで広がり、逆で狭まる。他のキーは無視する', () => {
		const resizer = createLeftAnchored();
		resizer.keydown({ key: 'ArrowRight', preventDefault: noop });
		expect(resizer.width).toBe(250);

		resizer.keydown({ key: 'ArrowLeft', preventDefault: noop });
		resizer.keydown({ key: 'ArrowLeft', preventDefault: noop });
		expect(resizer.width).toBe(230);

		resizer.keydown({ key: 'ArrowUp', preventDefault: noop });
		expect(resizer.width).toBe(230);
	});

	it('右辺に接するパネルは左矢印で広がる', () => {
		const resizer = createPanelResizer({
			initial: 280,
			min: 240,
			max: 480,
			step: 10,
			anchor: 'right',
		});
		resizer.keydown({ key: 'ArrowLeft', preventDefault: noop });
		expect(resizer.width).toBe(290);
	});
});
