import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ViewModeSwitch from '$components/molecules/ViewModeSwitch.svelte';

describe('表示切替スイッチ', () => {
	it('現在のモードが押下状態になる', () => {
		render(ViewModeSwitch, { props: { viewMode: 'list', onchange: () => {} } });
		expect(screen.getByRole('button', { name: 'リスト表示' }).ariaPressed).toBe('true');
		expect(screen.getByRole('button', { name: 'グリッド表示' }).ariaPressed).toBe('false');
	});

	it('もう一方を押すとonchangeが呼ばれる', async () => {
		const onchange = vi.fn<(mode: 'list' | 'grid') => void>();
		render(ViewModeSwitch, { props: { viewMode: 'list', onchange } });
		await fireEvent.click(screen.getByRole('button', { name: 'グリッド表示' }));
		expect(onchange).toHaveBeenCalledWith('grid');
	});
});
