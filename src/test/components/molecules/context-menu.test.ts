import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ContextMenu from '$components/molecules/ContextMenu.svelte';
import { stubElementAnimate } from '../../animation-test-util';
import { stubResizeObserver } from '../../resize-observer-test-util';

/** テスト用の項目 */
const items = [
	{ id: 'download', label: 'ダウンロード' },
	{ id: 'rename', label: '名前の変更', disabled: true },
	{ id: 'delete', label: '削除', danger: true },
];

/**
 * 開いた状態のメニューを描画する
 * @returns 選択と閉じるのモック
 */
const renderOpenMenu = () => {
	stubElementAnimate();
	stubResizeObserver();
	const onselect = vi.fn<(id: string) => void>();
	const onclose = vi.fn<() => void>();
	render(ContextMenu, { props: { open: true, x: 10, y: 20, items, onselect, onclose } });
	return { onselect, onclose };
};

describe('コンテキストメニュー', () => {
	it('項目がメニューとして表示され、最初の項目にフォーカスが当たる', () => {
		renderOpenMenu();
		const buttons = screen.getAllByRole('menuitem');
		expect(buttons.map((button) => button.textContent?.trim())).toStrictEqual([
			'ダウンロード',
			'名前の変更',
			'削除',
		]);
		expect(document.activeElement).toBe(buttons[0]);
	});

	it('項目を選ぶとonselectとoncloseが呼ばれ、無効な項目は押せない', async () => {
		const { onselect, onclose } = renderOpenMenu();
		await fireEvent.click(screen.getByRole('menuitem', { name: '削除' }));
		expect(onselect).toHaveBeenCalledWith('delete');
		expect(onclose).toHaveBeenCalledWith();
		expect(screen.getByRole('menuitem', { name: '名前の変更' })).toHaveProperty(
			'disabled',
			true,
		);
	});

	it('Escキーで閉じる', async () => {
		const { onclose } = renderOpenMenu();
		await fireEvent.keyDown(document, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledWith();
	});

	it('閉じている時は何も表示しない', () => {
		render(ContextMenu, {
			props: { open: false, x: 0, y: 0, items, onselect: () => {}, onclose: () => {} },
		});
		expect(screen.queryByRole('menu')).toBeNull();
	});
});
