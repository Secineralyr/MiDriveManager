<script lang="ts">
	import type { FileRecord } from '../../lib/db/schema';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconX from '@tabler/icons-svelte/icons/x';
	import Spinner from '$components/atoms/Spinner.svelte';
	import { createDialogCloser } from '../../lib/utils/dialog-close.svelte';
	import { fileKind } from '../../lib/utils/file-kind';
	import { formatFileSize } from '../../lib/utils/format';

	type Props = {
		/** プレビューするファイル(閉じている時はnull) */
		file: FileRecord | null;
		/** 閉じる操作 */
		onclose: () => void;
		/** ダウンロード操作(指定した場合だけボタンを表示する) */
		ondownload?: (file: FileRecord) => void;
	};

	let { file, onclose, ondownload }: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	let mediaLoading = $state(false);

	const kind = $derived(file === null ? 'other' : fileKind(file.type));

	$effect(() => {
		// ファイルが変わったら、メディアの読み込み表示をやり直す
		mediaLoading = file !== null && fileKind(file.type) !== 'other';
	});

	/** メディアの読み込み完了(または失敗)で読み込み表示を消す */
	const handleMediaReady = () => {
		mediaLoading = false;
	};

	const closer = createDialogCloser();

	$effect(() => {
		closer.sync(file !== null, dialog);
	});

	/** ダイアログが閉じられた時に状態を同期する */
	const handleClose = () => {
		if (file !== null) {
			onclose();
		}
	};

	/**
	 * Escキーでの即時クローズを止め、アニメーション付きの閉じる処理へ流す
	 * @param event - cancelイベント
	 */
	const handleCancelEvent = (event: Event) => {
		event.preventDefault();
		onclose();
	};

	/**
	 * メディアやバー以外の余白クリックで閉じる
	 * @param event - マウスイベント
	 */
	const handleDialogClick = (event: MouseEvent) => {
		const { target } = event;
		if (target === dialog) {
			onclose();
			return;
		}
		if (target instanceof HTMLElement && target.dataset['closeTarget'] !== undefined) {
			onclose();
		}
	};
</script>

<dialog
	bind:this={dialog}
	data-closing={closer.closing}
	onclose={handleClose}
	oncancel={handleCancelEvent}
	onclick={handleDialogClick}
>
	{#if file !== null}
		<header>
			<button type="button" aria-label="プレビューを閉じる" onclick={onclose}>
				<IconX size={20} />
			</button>
			<h2>{file.name}</h2>
			<span>{file.type} / {formatFileSize(file.size)}</span>
			{#if ondownload !== undefined}
				<button
					type="button"
					aria-label="ダウンロード"
					onclick={() => {
						ondownload(file);
					}}
				>
					<IconDownload size={20} />
				</button>
			{/if}
		</header>
		<div data-close-target>
			{#if mediaLoading}
				<span data-loading>
					<Spinner size={30} />
					<span>読み込んでいます</span>
				</span>
			{/if}
			{#if kind === 'image'}
				<img
					src={file.url}
					alt={file.name}
					data-mediaready={!mediaLoading}
					onload={handleMediaReady}
					onerror={handleMediaReady}
				/>
			{:else if kind === 'video'}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={file.url}
					controls
					data-mediaready={!mediaLoading}
					onloadeddata={handleMediaReady}
					onerror={handleMediaReady}
				></video>
			{:else if kind === 'audio'}
				<audio
					src={file.url}
					controls
					data-mediaready={!mediaLoading}
					oncanplay={handleMediaReady}
					onerror={handleMediaReady}
				></audio>
			{:else}
				<p>
					<FileTypeIcon mimeType={file.type} size={40} />
					<span>このファイルはプレビューできません</span>
				</p>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	/* プレビューはテーマに関わらず常に暗い全画面ビューアーとして表示する */
	dialog {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		border: 0;
		margin: 0;
		padding: 0;
		max-width: 100vw;
		max-height: 100dvh;
		width: 100vw;
		height: 100dvh;
		background-color: hsl(0 0% 5% / 0.5);
		color: hsl(0 0% 95%);
	}

	/* フェードで出入りする(閉じる時はJS側でclose()を遅らせ、data-closingの退出スタイルへ遷移させる) */
	dialog[open] {
		opacity: 1;
		transition: opacity 250ms ease;
	}

	@starting-style {
		dialog[open] {
			opacity: 0;
		}
	}

	dialog[open][data-closing='true'] {
		opacity: 0;
	}

	dialog[open] {
		display: flex;
		flex-direction: column;
	}

	dialog::backdrop {
		background-color: hsl(0 0% 5% / 0.5);
	}

	header {
		display: flex;
		align-items: center;
		padding: 10px 15px;
		gap: 10px;
	}

	header > button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border: 0;
		border-radius: 9999px;
		background-color: transparent;
		color: hsl(0 0% 95%);
		cursor: pointer;
		transition: background-color 250ms ease;
	}

	header > button:hover {
		background-color: hsl(0 0% 100% / 0.15);
	}

	header > button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	h2 {
		flex: 1;
		overflow: hidden;
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	header > span {
		font-size: 0.85rem;
		white-space: nowrap;
		color: hsl(0 0% 65%);
	}

	div {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		overflow: hidden;
		padding: 20px;
		min-height: 0;
	}

	img,
	video {
		object-fit: contain;
		max-width: 100%;
		max-height: 100%;
	}

	audio {
		inline-size: 320px;
		max-width: 100%;
	}

	p {
		display: flex;
		align-items: center;
		flex-direction: column;
		margin: 0;
		gap: 10px;
		color: hsl(0 0% 65%);
	}

	/* 読み込み中の表示 */
	[data-loading] {
		display: flex;
		position: absolute;
		align-items: center;
		gap: 10px;
		font-size: 0.95rem;
		color: hsl(0 0% 65%);
	}

	/* メディアは読み込みが終わるまで隠し、終わったらフェードで表示する */
	img,
	video,
	audio {
		opacity: 0;
		transition: opacity 250ms ease;
	}

	[data-mediaready='true'] {
		opacity: 1;
	}
</style>
