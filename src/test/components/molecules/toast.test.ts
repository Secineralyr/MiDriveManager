import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import Toast from '$components/molecules/Toast.svelte';

describe('トースト表示', () => {
	it('エラー種別はalertロールでメッセージが表示される', () => {
		render(Toast, {
			props: {
				message: '操作に失敗しました',
				kind: 'error',
				durationMs: 5000,
				ondismiss: () => {},
			},
		});
		expect(screen.getByRole('alert').textContent).toContain('操作に失敗しました');
	});

	it('情報種別はstatusロールで表示される', () => {
		render(Toast, {
			props: {
				message: '同期が完了しました',
				kind: 'info',
				durationMs: 5000,
				ondismiss: () => {},
			},
		});
		expect(screen.getByRole('status').textContent).toContain('同期が完了しました');
	});

	it('閉じるボタンを押すとondismissが呼ばれる', async () => {
		const ondismiss = vi.fn<() => void>();
		render(Toast, {
			props: { message: '操作に失敗しました', kind: 'error', durationMs: 5000, ondismiss },
		});
		await fireEvent.click(screen.getByRole('button', { name: '通知を閉じる' }));
		expect(ondismiss).toHaveBeenCalledWith();
	});
});
