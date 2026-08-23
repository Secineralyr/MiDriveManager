import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import AccountWizard from '$components/organisms/AccountWizard.svelte';
import type { ComponentProps } from 'svelte';
import { stubElementAnimate } from '../../animation-test-util';

/**
 * 省略された項目を既定値で補ってウィザードを描画する
 * @param props - 上書きするプロパティ
 * @returns 描画結果とコールバックのモック
 */
const renderWizard = (props: Partial<ComponentProps<typeof AccountWizard>> = {}) => {
	stubElementAnimate();
	const onstart = vi.fn<(host: string) => void>();
	const oncancel = vi.fn<() => void>();
	const onacceptnotice = vi.fn<() => void>();
	const result = render(AccountWizard, {
		noticeAccepted: true,
		onacceptnotice,
		cancellable: false,
		busy: false,
		error: null,
		onstart,
		oncancel,
		...props,
	});
	return { ...result, onstart, oncancel, onacceptnotice };
};

/**
 * 描画結果からフォーム要素を取得する
 * @param container - 描画結果のコンテナ要素
 * @returns フォーム要素
 */
const getForm = (container: HTMLElement) => {
	const form = container.querySelector('form');
	if (form === null) {
		throw new Error('フォームが見つかりません');
	}
	return form;
};

describe('アカウント追加ウィザードの表示', () => {
	it('ホスト名の初期値はmisskey.ioになっている', () => {
		renderWizard();
		const input = screen.getByLabelText<HTMLInputElement>('サーバーのホスト名');
		expect(input.value).toBe('misskey.io');
	});

	it('エラーメッセージが渡されると表示される', () => {
		renderWizard({ error: '認証に失敗しました' });
		expect(screen.getByRole('alert').textContent).toBe('認証に失敗しました');
	});

	it('cancellableがfalseの場合はキャンセルボタンが表示されない', () => {
		renderWizard({ cancellable: false });
		expect(screen.queryByText('キャンセル')).toBeNull();
	});

	it('busyの場合は送信ボタンの代わりに確認中の表示になる', () => {
		renderWizard({ busy: true });
		expect(screen.queryByText('認証してアカウントを追加')).toBeNull();
		expect(screen.queryByText('認証結果を確認しています')).not.toBeNull();
	});
});

describe('アカウント追加ウィザードの操作', () => {
	it('送信すると入力したホスト名でonstartが呼ばれる', async () => {
		const { onstart, container } = renderWizard();
		const input = screen.getByLabelText<HTMLInputElement>('サーバーのホスト名');
		await fireEvent.input(input, { target: { value: 'example.com' } });
		await fireEvent.submit(getForm(container));
		expect(onstart).toHaveBeenCalledWith('example.com');
	});

	it('空のまま送信するとエラーが表示されonstartは呼ばれない', async () => {
		const { onstart, container } = renderWizard();
		const input = screen.getByLabelText<HTMLInputElement>('サーバーのホスト名');
		await fireEvent.input(input, { target: { value: '   ' } });
		await fireEvent.submit(getForm(container));
		expect(onstart).not.toHaveBeenCalled();
		expect(screen.queryByText('ホスト名を入力してください')).not.toBeNull();
	});

	it('cancellableがtrueの場合はキャンセルでoncancelが呼ばれる', async () => {
		const { oncancel } = renderWizard({ cancellable: true });
		await fireEvent.click(screen.getByText('キャンセル'));
		expect(oncancel).toHaveBeenCalledWith();
	});
});

describe('アカウント追加時のオーバーレイ表示', () => {
	it('overlay指定で背景を重ねる表示になる', () => {
		const { container } = renderWizard({ overlay: true, cancellable: true });
		expect(container.querySelector('section')?.dataset.overlay).toBe('true');
	});
});

describe('初回利用時の諸注意', () => {
	it('未同意なら諸注意と「わかった」ボタンだけを表示し、ホスト名の入力は出さない', () => {
		const { container } = renderWizard({ noticeAccepted: false });
		expect(screen.getByRole('heading', { name: 'ご利用にあたっての注意' })).toBeDefined();
		expect(screen.getByText(/このツールは、Misskeyサーバー上のドライブ上/u)).toBeDefined();
		expect(screen.getByRole('button', { name: 'わかった' })).toBeDefined();
		expect(container.querySelector('form')).toBeNull();
	});

	it('「わかった」を押すとonacceptnoticeが呼ばれる', async () => {
		const { onacceptnotice } = renderWizard({ noticeAccepted: false });
		await fireEvent.click(screen.getByRole('button', { name: 'わかった' }));
		expect(onacceptnotice).toHaveBeenCalledWith();
	});
});
