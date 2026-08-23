import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toastStore } from '../../lib/stores/toast.svelte';

/** テストごとにタイマーを疑似時計にし、表示中のトーストをすべて消す */
const reset = () => {
	vi.useFakeTimers();
	for (const toast of toastStore.toasts) {
		toastStore.dismiss(toast.id);
	}
};

describe('トースト通知', () => {
	beforeEach(reset);

	afterEach(() => {
		vi.useRealTimers();
	});

	it('表示すると一覧に追加され、種類の省略時はエラーになる', () => {
		const id = toastStore.show({ message: '操作に失敗しました' });
		expect(toastStore.toasts).toStrictEqual([
			{ id, kind: 'error', message: '操作に失敗しました', durationMs: 5000 },
		]);
	});

	it('種類を指定して表示できる', () => {
		const id = toastStore.show({ message: '同期が完了しました', kind: 'info' });
		expect(toastStore.toasts).toStrictEqual([
			{ id, kind: 'info', message: '同期が完了しました', durationMs: 5000 },
		]);
	});

	it('閉じると対象のトーストだけが消える', () => {
		const first = toastStore.show({ message: '1件目' });
		const second = toastStore.show({ message: '2件目' });
		toastStore.dismiss(first);
		expect(toastStore.toasts.map((toast) => toast.id)).toStrictEqual([second]);
	});

	it('一定時間が経過すると自動的に消える', () => {
		toastStore.show({ message: '操作に失敗しました' });
		vi.advanceTimersByTime(4999);
		expect(toastStore.toasts).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(toastStore.toasts).toHaveLength(0);
	});
});
