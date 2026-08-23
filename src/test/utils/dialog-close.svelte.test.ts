import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDialogCloser } from '../../lib/utils/dialog-close.svelte';

/**
 * テスト用のdialog相当を作る
 * @returns dialog相当
 */
const makeDialog = () => ({
	open: false,
	showModal() {
		this.open = true;
	},
	close() {
		this.open = false;
	},
});

describe('ダイアログの閉じる制御', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('openになるとすぐ表示し、closingにはならない', () => {
		const closer = createDialogCloser();
		const dialog = makeDialog();
		closer.sync(true, dialog);
		expect(dialog.open).toBe(true);
		expect(closer.closing).toBe(false);
	});

	it('閉じる時はclosingを立てて待ち時間の後にclose()する', () => {
		const closer = createDialogCloser();
		const dialog = makeDialog();
		closer.sync(true, dialog);
		closer.sync(false, dialog);
		expect(closer.closing).toBe(true);
		expect(dialog.open).toBe(true);

		vi.advanceTimersByTime(250);
		expect(dialog.open).toBe(false);
		expect(closer.closing).toBe(false);
	});

	it('閉じている途中で開き直すと、予約された閉じる処理は取り消される', () => {
		const closer = createDialogCloser();
		const dialog = makeDialog();
		closer.sync(true, dialog);
		closer.sync(false, dialog);
		closer.sync(true, dialog);
		expect(closer.closing).toBe(false);

		vi.advanceTimersByTime(500);
		expect(dialog.open).toBe(true);
	});
});
