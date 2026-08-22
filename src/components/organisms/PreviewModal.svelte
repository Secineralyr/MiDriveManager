<script lang="ts">
	import type { FileRecord } from '../../lib/db/schema';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import IconX from '@tabler/icons-svelte/icons/x';
	import { fileKind } from '../../lib/utils/file-kind';
	import { formatFileSize } from '../../lib/utils/format';

	type Props = {
		/** プレビューするファイル(閉じている時はnull) */
		file: FileRecord | null;
		/** 閉じる操作 */
		onclose: () => void;
	};

	let { file, onclose }: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	const kind = $derived(file === null ? 'other' : fileKind(file.type));

	$effect(() => {
		if (dialog === null) {
			return;
		}
		if (file !== null && !dialog.open) {
			dialog.showModal();
		} else if (file === null && dialog.open) {
			dialog.close();
		}
	});

	/** Escキーなどでダイアログが閉じられた時に状態を同期する */
	const handleClose = () => {
		if (file !== null) {
			onclose();
		}
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

<dialog bind:this={dialog} onclose={handleClose} onclick={handleDialogClick}>
	{#if file !== null}
		<header>
			<button type="button" aria-label="プレビューを閉じる" onclick={onclose}>
				<IconX size={20} />
			</button>
			<h2>{file.name}</h2>
			<span>{file.type} / {formatFileSize(file.size)}</span>
		</header>
		<div data-close-target>
			{#if kind === 'image'}
				<img src={file.url} alt={file.name} />
			{:else if kind === 'video'}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video src={file.url} controls></video>
			{:else if kind === 'audio'}
				<audio src={file.url} controls></audio>
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
		background-color: hsl(0 0% 5% / 0.95);
		color: hsl(0 0% 95%);
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
</style>
