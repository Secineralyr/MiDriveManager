import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import SearchBox from '$components/molecules/SearchBox.svelte';

/**
 * 検索ボックスを描画する
 * @param value - 検索語
 * @returns 入力と解除のモック
 */
const renderBox = (value: string) => {
	const oninput = vi.fn<(value: string) => void>();
	const onclear = vi.fn<() => void>();
	render(SearchBox, { props: { value, oninput, onclear } });
	return { oninput, onclear };
};

describe('検索ボックス', () => {
	it('入力するたびにoninputへ入力値が渡される', async () => {
		const { oninput } = renderBox('');
		await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'がぞ' } });
		expect(oninput).toHaveBeenCalledWith('がぞ');
	});

	it('検索語があれば解除ボタンが出て、押すとonclearが呼ばれる', async () => {
		const { onclear } = renderBox('がぞ');
		await fireEvent.click(screen.getByRole('button', { name: '検索を解除' }));
		expect(onclear).toHaveBeenCalledWith();
	});

	it('検索語が空なら解除ボタンは出ず、Escでも解除しない', async () => {
		const { onclear } = renderBox('');
		expect(screen.queryByRole('button', { name: '検索を解除' })).toBeNull();
		await fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
		expect(onclear).not.toHaveBeenCalled();
	});

	it('検索語があればEscで解除する', async () => {
		const { onclear } = renderBox('がぞ');
		await fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
		expect(onclear).toHaveBeenCalledWith();
	});
});
