import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import TutorialTour from '$components/organisms/TutorialTour.svelte';
import { stubElementAnimate } from '../../animation-test-util';
import { stubResizeObserver } from '../../resize-observer-test-util';
import { tutorialSteps } from '../../../lib/services/tutorial';

/**
 * 開いた状態のツアーを描画する
 * @param extra - モードの指定(スマートフォン・タブレット)
 * @returns 閉じる操作のモック
 */
const renderTour = (
	extra: {
		/** スマートフォン表示かどうか */
		phone?: boolean;
		/** タブレット表示かどうか */
		tablet?: boolean;
	} = {},
) => {
	stubElementAnimate();
	stubResizeObserver();
	const onclose = vi.fn<() => void>();
	render(TutorialTour, { props: { open: true, onclose, ...extra } });
	return { onclose };
};

describe('チュートリアルツアー', () => {
	it('最初の歩の見出しとデモのハイライト対象が表示される', () => {
		renderTour();
		expect(screen.getByRole('heading', { name: 'フォルダツリー' })).toBeDefined();
		expect(screen.getByText('1 / 6')).toBeDefined();
		expect(document.querySelector('[data-tour="tree"]')).not.toBeNull();
		expect(document.querySelector('[data-tour="queue"]')).not.toBeNull();
	});

	it('次へで進み、戻るで戻れる', async () => {
		renderTour();
		await fireEvent.click(screen.getByRole('button', { name: '次へ' }));
		expect(screen.getByRole('heading', { name: 'ファイル一覧' })).toBeDefined();

		await fireEvent.click(screen.getByRole('button', { name: '戻る' }));
		expect(screen.getByRole('heading', { name: 'フォルダツリー' })).toBeDefined();
	});

	it('スキップで閉じ、最後の歩の完了でも閉じる', async () => {
		const { onclose } = renderTour();
		await fireEvent.click(screen.getByRole('button', { name: 'スキップ' }));
		expect(onclose).toHaveBeenCalledWith();

		for (let stepIndex = 1; stepIndex < tutorialSteps('desktop').length; stepIndex += 1) {
			// oxlint-disable-next-line eslint/no-await-in-loop - 歩を順に進める
			await fireEvent.click(screen.getByRole('button', { name: '次へ' }));
		}
		await fireEvent.click(screen.getByRole('button', { name: '完了' }));
		expect(onclose).toHaveBeenCalledTimes(2);
	});

	it('スマートフォンでは歩が5つになり、ツリー開閉ボタンとアカウントアイコンを対象にする', () => {
		renderTour({ phone: true });
		expect(screen.getByText('1 / 5')).toBeDefined();
		expect(document.querySelector('[data-tour="tree-toggle"]')).not.toBeNull();
		expect(document.querySelector('[data-tour="account"]')).not.toBeNull();
		expect(document.querySelector('[data-tour="queue"]')).toBeNull();
	});

	it('閉じている時は何も表示しない', () => {
		stubElementAnimate();
		stubResizeObserver();
		render(TutorialTour, { props: { open: false, onclose: () => {} } });
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
