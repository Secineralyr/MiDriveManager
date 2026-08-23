import { clipboardStore } from './clipboard.svelte';
import { driveActionsStore } from './drive-actions.svelte';
import { driveStore } from './drive.svelte';
import { toastStore } from './toast.svelte';

/**
 * エラーメッセージをトースト表示へ振り替える
 * @param message - エラーメッセージ(なければnull)
 * @param clear - 振り替え後に元のエラーを消す処理
 */
export const forwardErrorToToast = (message: string | null, clear: () => void) => {
	if (message === null) {
		return;
	}

	toastStore.show({ message });
	clear();
};

/**
 * ドライブ系ストア(閲覧・基本操作・クリップボード)のエラーをトースト表示へ振り替える
 * リアクティブな文脈($effect内)から呼ぶことで、エラー発生のたびにトーストが表示される
 */
export const forwardDriveErrorsToToast = () => {
	forwardErrorToToast(driveStore.error, () => {
		driveStore.clearError();
	});
	forwardErrorToToast(driveActionsStore.error, () => {
		driveActionsStore.clearError();
	});
	forwardErrorToToast(clipboardStore.error, () => {
		clipboardStore.clearError();
	});
};
