import { describe, expect, it } from 'vitest';
import { createDriveDrag } from '../../lib/stores/drive-drag';

/**
 * ドラッグ処理のテスト用の文脈と記録を作る(選択中は常にfile:f1とfile:f2の2件)
 * @returns ドラッグ処理と記録
 */
const createDragFixture = () => {
	const record = {
		selected: [] as string[],
		moved: [] as {
			/** 移動先のフォルダID */
			targetFolderId: string | null;
			/** 移動した件数 */
			count: number;
		}[],
		cleared: 0,
		menuClosed: 0,
	};
	let menuOpen = true;
	const drag = createDriveDrag({
		selectItem: (kind, id) => {
			record.selected.push(`${kind}:${id}`);
		},
		selectedKeys: () => ['file:f1', 'file:f2'],
		isMenuOpen: () => menuOpen,
		closeMenu: () => {
			record.menuClosed += 1;
			menuOpen = false;
		},
		moveItems: (items, targetFolderId) => {
			record.moved.push({ targetFolderId, count: items.length });
		},
		clearSelection: () => {
			record.cleared += 1;
		},
	});
	return { drag, record };
};

describe('ドラッグでの移動', () => {
	it('ドラッグ開始は項目を選択し、ドロップで選択中の項目の移動を積んで選択を解除する', () => {
		const { drag, record } = createDragFixture();
		drag.startItem('file', 'f1');
		drag.drop('d1');
		expect(record.selected).toStrictEqual(['file:f1']);
		expect(record.moved).toStrictEqual([{ targetFolderId: 'd1', count: 2 }]);
		expect(record.cleared).toBe(1);
	});

	it('ドラッグを終了した後のドロップは何もしない', () => {
		const { drag, record } = createDragFixture();
		drag.startItem('file', 'f1');
		drag.end();
		drag.drop(null);
		expect(record.moved).toStrictEqual([]);
		expect(record.cleared).toBe(0);
	});

	it('開始位置から小さな動きではメニューを閉じず、大きく動くと閉じる', () => {
		const { drag, record } = createDragFixture();
		drag.startItem('file', 'f1');
		drag.beginTrack({ clientX: 100, clientY: 100 });
		drag.track({ clientX: 120, clientY: 110 });
		expect(record.menuClosed).toBe(0);

		drag.track({ clientX: 140, clientY: 100 });
		expect(record.menuClosed).toBe(1);

		drag.track({ clientX: 300, clientY: 300 });
		expect(record.menuClosed).toBe(1);
	});

	it('項目をドラッグしていない時は位置の監視でメニューを閉じない', () => {
		const { drag, record } = createDragFixture();
		drag.beginTrack({ clientX: 100, clientY: 100 });
		drag.track({ clientX: 300, clientY: 300 });
		expect(record.menuClosed).toBe(0);
	});
});
