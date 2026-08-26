import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardDriveErrorsToToast, forwardErrorToToast } from '../../lib/stores/drive-error-toast';
import type { AccountRecord } from '../../lib/db/schema';
import type { ActionsClient } from '../../lib/services/drive-actions';
import { driveActionsStore } from '../../lib/stores/drive-actions.svelte';
import { toastStore } from '../../lib/stores/toast.svelte';

/** テスト用のアカウント */
const account: AccountRecord = {
	id: 'a1',
	host: 'misskey.example',
	token: 'token-1',
	userId: 'u1',
	username: 'alice',
	name: 'アリス',
	avatarUrl: null,
	createdAt: '2026-08-21T00:00:00.000Z',
	lastSyncedAt: null,
};

/** すべての操作が失敗するクライアント */
const failingClient: ActionsClient = {
	driveFoldersCreate: () => Promise.reject(new Error('未使用')),
	driveFoldersUpdate: () => Promise.reject(new Error('名前を変更できませんでした')),
	driveFoldersDelete: () => Promise.reject(new Error('未使用')),
	driveFilesUpdate: () => Promise.reject(new Error('未使用')),
	driveFilesDelete: () => Promise.reject(new Error('未使用')),
	driveFilesMoveBulk: () => Promise.reject(new Error('未使用')),
};

/** テストごとに表示中のトーストと操作エラーを消す */
const reset = () => {
	for (const toast of toastStore.toasts) {
		toastStore.dismiss(toast.id);
	}
	driveActionsStore.clearError();
};

describe('エラーのトースト振り替え', () => {
	beforeEach(reset);

	it('エラーがない場合は何もしない', () => {
		const clear = vi.fn<() => void>();
		forwardErrorToToast(null, clear);
		expect(toastStore.toasts).toHaveLength(0);
		expect(clear).not.toHaveBeenCalled();
	});

	it('エラーがある場合はトーストへ積み、元のエラーを消す', () => {
		const clear = vi.fn<() => void>();
		forwardErrorToToast('操作に失敗しました', clear);
		expect(toastStore.toasts.map((toast) => toast.message)).toStrictEqual([
			'操作に失敗しました',
		]);
		expect(clear).toHaveBeenCalledWith();
	});

	it('ドライブ操作ストアのエラーがトーストへ移される', async () => {
		const ok = await driveActionsStore.rename(
			account,
			{ item: { kind: 'folder', id: 'd1' }, name: '新規' },
			() => failingClient,
		);
		expect(ok).toBe(false);
		forwardDriveErrorsToToast();
		expect(toastStore.toasts.map((toast) => toast.message)).toStrictEqual([
			'名前を変更できませんでした',
		]);
		expect(driveActionsStore.error).toBeNull();
	});
});
