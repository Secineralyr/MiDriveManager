import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import Breadcrumbs from '$components/molecules/Breadcrumbs.svelte';
import { stubResizeObserver } from '../../resize-observer-test-util';

/** テスト用の経路(ルート/写真/海) */
const items = [
	{ id: null, name: 'ルート' },
	{ id: 'd1', name: '写真' },
	{ id: 'd2', name: '海' },
];

/**
 * パンくずを描画する
 * @returns コールバックのモック
 */
const renderCrumbs = () => {
	stubResizeObserver();
	const onnavigate = vi.fn<(folderId: string | null) => void>();
	const ondropitems = vi.fn<(folderId: string | null) => void>();
	const ondropfiles = vi.fn<(folderId: string | null, transfer: DataTransfer) => void>();
	render(Breadcrumbs, { props: { items, onnavigate, ondropitems, ondropfiles } });
	return { onnavigate, ondropitems, ondropfiles };
};

describe('パンくずへのドロップ', () => {
	it('経路のフォルダへアプリ内の項目をドロップすると移動先として通知される', async () => {
		const { ondropitems } = renderCrumbs();
		const transfer = { types: ['text/plain'], dropEffect: 'none' };
		await fireEvent.drop(screen.getByRole('button', { name: 'ルート' }), {
			dataTransfer: transfer,
		});
		expect(ondropitems).toHaveBeenCalledWith(null);
	});

	it('OSのファイルをドロップするとアップロード先として通知される', async () => {
		const { ondropitems, ondropfiles } = renderCrumbs();
		const transfer = { types: ['Files'], dropEffect: 'none' };
		await fireEvent.drop(screen.getByRole('button', { name: '写真' }), {
			dataTransfer: transfer,
		});
		expect(ondropfiles).toHaveBeenCalledWith('d1', transfer);
		expect(ondropitems).not.toHaveBeenCalled();
	});
});
