<script lang="ts">
	import type { FileRecord } from '../../lib/db/schema';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import IconChevronLeft from '@tabler/icons-svelte/icons/chevron-left';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconInfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import IconX from '@tabler/icons-svelte/icons/x';
	import Spinner from '$components/atoms/Spinner.svelte';
	import { adjacentFiles } from '../../lib/utils/preview-nav';
	import { createDialogCloser } from '../../lib/utils/dialog-close.svelte';
	import { fileKind } from '../../lib/utils/file-kind';
	import { formatFileSize } from '../../lib/utils/format';
	import { pinchZoom } from '../../lib/utils/pinch-zoom';

	type Props = {
		/** プレビューするファイル(閉じている時はnull) */
		file: FileRecord | null;
		/** 閉じる操作 */
		onclose: () => void;
		/** ダウンロード操作(指定した場合だけボタンを表示する) */
		ondownload?: (file: FileRecord) => void;
		/** 詳細を開く操作(指定した場合だけボタンを表示する) */
		ondetails?: (file: FileRecord) => void;
		/** 隣接ファイルへの移動に使う表示順の一覧(未指定なら移動ボタンを出さない。スマートフォンでは画面が足りないため渡さない) */
		files?: FileRecord[];
		/** 隣接ファイルへ表示を切り替える操作 */
		onnavigate?: (file: FileRecord) => void;
	};

	let { file, onclose, ondownload, ondetails, files, onnavigate }: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	let mediaLoading = $state(false);

	let image = $state<HTMLImageElement | null>(null);

	let displayed = $state<FileRecord | null>(null);

	$effect(() => {
		if (file !== null) {
			displayed = file;
		}
	});

	const kind = $derived(displayed === null ? 'other' : fileKind(displayed.type));

	const adjacent = $derived(
		displayed === null || files === undefined
			? { prev: null, next: null }
			: adjacentFiles(files, displayed.id),
	);

	const navigable = $derived(files !== undefined && onnavigate !== undefined);

	/**
	 * 左右キーで隣のファイルへ移動する
	 * @param event - キーボードイベント
	 */
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'ArrowLeft' && adjacent.prev !== null) {
			onnavigate?.(adjacent.prev);
		}

		if (event.key === 'ArrowRight' && adjacent.next !== null) {
			onnavigate?.(adjacent.next);
		}
	};

	$effect(() => {
		// 表示するファイルが変わったら読み込み表示をやり直す
		mediaLoading = displayed !== null && fileKind(displayed.type) !== 'other';
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
	onkeydown={handleKeydown}
>
	{#if displayed !== null}
		{@const shown = displayed}
		<header>
			<button type="button" aria-label="プレビューを閉じる" onclick={onclose}>
				<IconX size={20} />
			</button>
			<h2>{shown.name}</h2>
			<span>{shown.type} / {formatFileSize(shown.size)}</span>
			{#if ondetails !== undefined}
				<button
					type="button"
					aria-label="詳細"
					onclick={() => {
						ondetails(shown);
					}}
				>
					<IconInfoCircle size={20} />
				</button>
			{/if}
			{#if ondownload !== undefined}
				<button
					type="button"
					aria-label="ダウンロード"
					onclick={() => {
						ondownload(shown);
					}}
				>
					<IconDownload size={20} />
				</button>
			{/if}
		</header>
		<!-- svelte-ignore a11y_autofocus, a11y_no_noninteractive_tabindex -- 開いた直後のフォーカスを閉じるボタンでなく表示領域に置き、閉じるボタンにフォーカス枠が出っぱなしにならないようにする -->
		<div data-close-target tabindex="-1" autofocus use:pinchZoom={image}>
			{#if mediaLoading}
				<span data-loading>
					<Spinner size={30} />
					<span>読み込んでいます</span>
				</span>
			{/if}
			{#key shown.id}
			{#if kind === 'image'}
				<img
					bind:this={image}
					src={shown.url}
					alt={shown.name}
					data-mediaready={!mediaLoading}
					onload={handleMediaReady}
					onerror={handleMediaReady}
				/>
			{:else if kind === 'video'}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={shown.url}
					controls
					data-mediaready={!mediaLoading}
					onloadeddata={handleMediaReady}
					onerror={handleMediaReady}
				></video>
			{:else if kind === 'audio'}
				<audio
					src={shown.url}
					controls
					data-mediaready={!mediaLoading}
					oncanplay={handleMediaReady}
					onerror={handleMediaReady}
				></audio>
			{:else}
				<p>
					<FileTypeIcon mimeType={shown.type} size={40} />
					<span>このファイルはプレビューできません</span>
				</p>
			{/if}
			{/key}
		</div>
		{#if navigable}
			<button
				type="button"
				data-nav="prev"
				aria-label="前のファイル"
				disabled={adjacent.prev === null}
				onclick={() => {
					if (adjacent.prev !== null) {
						onnavigate?.(adjacent.prev);
					}
				}}
			>
				<IconChevronLeft size={25} />
			</button>
			<button
				type="button"
				data-nav="next"
				aria-label="次のファイル"
				disabled={adjacent.next === null}
				onclick={() => {
					if (adjacent.next !== null) {
						onnavigate?.(adjacent.next);
					}
				}}
			>
				<IconChevronRight size={25} />
			</button>
		{/if}
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

	dialog[open]::backdrop {
		opacity: 1;
		transition: opacity 250ms ease;
	}

	@starting-style {
		dialog[open]::backdrop {
			opacity: 0;
		}
	}

	dialog[open][data-closing='true']::backdrop {
		opacity: 0;
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

	/* 表示領域は初期フォーカスの置き場なので枠を出さない。ピンチやドラッグを自前で扱うためブラウザのタッチ操作は止める */
	div {
		touch-action: none;
	}

	div:focus,
	div:focus-visible {
		outline: none;
	}

	/* 拡大縮小は表示領域の中心を基準にする */
	img {
		transform-origin: center;
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

	/* 隣ファイルへ移動するボタン */
	[data-nav] {
		display: inline-flex;
		position: absolute;
		top: 50%;
		z-index: 1;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 9999px;
		padding: 10px;
		background-color: hsl(0 0% 100% / 0.1);
		color: hsl(0 0% 95%);
		cursor: pointer;
		transform: translateY(-50%);
		transition:
			background-color 250ms ease,
			opacity 250ms ease;
	}

	[data-nav]:enabled:hover {
		background-color: hsl(0 0% 100% / 0.2);
	}

	[data-nav]:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	[data-nav]:disabled {
		opacity: 0.25;
		cursor: default;
	}

	[data-nav='prev'] {
		left: 15px;
	}

	[data-nav='next'] {
		right: 15px;
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
