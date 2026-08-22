<script lang="ts">
	import { completeMiauth, startMiauthSession, takePendingMiauth } from './lib/auth/miauth';
	import AccountWizard from '$components/organisms/AccountWizard.svelte';
	import AppHeader from '$components/organisms/AppHeader.svelte';
	import DriveExplorer from '$components/organisms/DriveExplorer.svelte';
	import Spinner from '$components/atoms/Spinner.svelte';
	import { accountsStore } from './lib/stores/accounts.svelte';
	import { driveStore } from './lib/stores/drive.svelte';
	import { onMount } from 'svelte';
	import { syncStore } from './lib/stores/sync.svelte';

	/** 表示する画面の種類 */
	type Screen = 'loading' | 'wizard' | 'main';

	let screen = $state<Screen>('loading');
	let wizardBusy = $state(false);
	let wizardError = $state<string | null>(null);

	const activeAccount = $derived(accountsStore.active);

	/**
	 * 予期しないエラーをコンソールに記録する
	 * @param error - 発生したエラー
	 */
	const reportUnexpectedError = (error: unknown) => {
		console.error(error);
	};

	/**
	 * MiAuthコールバックのセッションからトークン取得とアカウント追加までを行う
	 * @param session - コールバックURLのセッションID
	 */
	const finishAuthorization = async (session: string) => {
		const pending = takePendingMiauth(session);
		if (pending === null) {
			throw new Error('認証セッションの情報が見つかりません。もう一度お試しください');
		}
		const result = await completeMiauth(pending);
		await accountsStore.add(pending.host, result.token, result.user);
	};

	/**
	 * MiAuthコールバックを処理する(処理後はURLからクエリを取り除く)
	 * @param session - コールバックURLのセッションID
	 */
	const handleMiauthCallback = async (session: string) => {
		history.replaceState(null, '', location.pathname);
		screen = 'wizard';
		wizardBusy = true;
		try {
			await finishAuthorization(session);
			wizardError = null;
		} catch (error) {
			wizardError = error instanceof Error ? error.message : '認証に失敗しました';
		}
		wizardBusy = false;
	};

	/** アカウント読み込みとMiAuthコールバック処理を行うアプリ初期化 */
	const initialize = async () => {
		try {
			await accountsStore.load();
			const session = new URLSearchParams(location.search).get('session');
			if (session !== null) {
				await handleMiauthCallback(session);
				if (wizardError !== null) {
					return;
				}
			}
			screen = accountsStore.active === null ? 'wizard' : 'main';
		} catch (error) {
			reportUnexpectedError(error);
		}
	};

	/**
	 * 認証を開始してMisskeyの許可画面へ遷移する
	 * @param host - 入力されたホスト名
	 */
	const handleStartAuth = (host: string) => {
		try {
			const url = startMiauthSession(host, `${location.origin}${location.pathname}`);
			location.assign(url);
		} catch (error) {
			wizardError = error instanceof Error ? error.message : '認証を開始できませんでした';
		}
	};

	/** ウィザードを閉じてメイン画面に戻る */
	const handleWizardCancel = () => {
		wizardError = null;
		if (accountsStore.active !== null) {
			screen = 'main';
		}
	};

	/**
	 * アカウントを切り替える
	 * @param accountId - 切り替え先のアカウントID
	 */
	const handleSwitch = async (accountId: string) => {
		try {
			await accountsStore.switchTo(accountId);
		} catch (error) {
			reportUnexpectedError(error);
		}
	};

	/** アカウント追加のためにウィザードを開く */
	const handleAdd = () => {
		wizardError = null;
		screen = 'wizard';
	};

	/**
	 * アカウントを削除し、アカウントがなくなった場合はウィザードに戻る
	 * @param accountId - 削除するアカウントID
	 */
	const handleRemove = async (accountId: string) => {
		try {
			await accountsStore.remove(accountId);
			if (accountsStore.active === null) {
				wizardError = null;
				screen = 'wizard';
			}
		} catch (error) {
			reportUnexpectedError(error);
		}
	};

	/** アクティブアカウントの同期を開始する */
	const handleResync = () => {
		if (activeAccount !== null) {
			syncStore.run(activeAccount);
		}
	};

	/**
	 * フォルダへ移動する
	 * @param folderId - 移動先のフォルダID(ルートはnull)
	 */
	const handleNavigate = (folderId: string | null) => {
		driveStore.openFolder(folderId);
	};

	onMount(initialize);

	$effect(() => {
		if (screen === 'main' && activeAccount !== null) {
			syncStore.run(activeAccount);
		}
	});

	$effect(() => {
		if (screen === 'main' && activeAccount !== null && driveStore.accountId !== activeAccount.id) {
			driveStore.openAccount(activeAccount.id);
		}
	});

	$effect(() => {
		if (
			syncStore.status === 'idle' &&
			syncStore.accountId !== null &&
			syncStore.accountId === driveStore.accountId
		) {
			driveStore.refresh();
		}
	});
</script>

{#if screen === 'loading'}
	<section>
		<Spinner size={30} />
	</section>
{:else if screen === 'wizard' || activeAccount === null}
	<AccountWizard
		cancellable={activeAccount !== null && !wizardBusy}
		busy={wizardBusy}
		error={wizardError}
		onstart={handleStartAuth}
		oncancel={handleWizardCancel}
	/>
{:else}
	<AppHeader
		accounts={accountsStore.accounts}
		active={activeAccount}
		syncStatus={syncStore.status}
		syncCount={syncStore.folderCount + syncStore.fileCount}
		onswitch={handleSwitch}
		onadd={handleAdd}
		onremove={handleRemove}
		onresync={handleResync}
	/>
	<DriveExplorer
		childrenMap={driveStore.childrenMap}
		currentFolderId={driveStore.currentFolderId}
		breadcrumb={driveStore.breadcrumb}
		folders={driveStore.childFolders}
		files={driveStore.files}
		viewMode={driveStore.viewMode}
		sortKey={driveStore.sortKey}
		sortOrder={driveStore.sortOrder}
		error={driveStore.error}
		onnavigate={handleNavigate}
		onsort={(key) => {
			driveStore.toggleSort(key);
		}}
		onviewmode={(mode) => {
			driveStore.changeViewMode(mode);
		}}
	/>
{/if}

<style>
	section {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
	}
</style>
