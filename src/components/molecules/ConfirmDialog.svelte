<script lang="ts">
	import Button from '$components/atoms/Button.svelte';
	import { createDialogCloser } from '../../lib/utils/dialog-close.svelte';

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** ダイアログの見出し */
		title: string;
		/** 本文メッセージ */
		message: string;
		/** 確定ボタンのラベル */
		confirmLabel?: string;
		/** 破壊的操作かどうか(確定ボタンが赤くなる) */
		danger?: boolean;
		/** 確定時の処理 */
		onconfirm: () => void;
		/** キャンセル時の処理 */
		oncancel: () => void;
	};

	let {
		open,
		title,
		message,
		confirmLabel = 'OK',
		danger = false,
		onconfirm,
		oncancel,
	}: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	const closer = createDialogCloser();

	$effect(() => {
		closer.sync(open, dialog);
	});

	/** ダイアログが閉じられた時にキャンセル扱いにする */
	const handleClose = () => {
		if (open) {
			oncancel();
		}
	};

	/**
	 * Escキーでの即時クローズを止め、アニメーション付きの閉じる処理へ流す
	 * @param event - cancelイベント
	 */
	const handleCancelEvent = (event: Event) => {
		event.preventDefault();
		oncancel();
	};
</script>

<dialog
	bind:this={dialog}
	data-closing={closer.closing}
	onclose={handleClose}
	oncancel={handleCancelEvent}
>
	<h2>{title}</h2>
	<p>{message}</p>
	<div>
		<Button variant="text" onclick={oncancel}>キャンセル</Button>
		<Button variant={danger ? 'danger' : 'filled'} onclick={onconfirm}>{confirmLabel}</Button>
	</div>
</dialog>

<style>
	dialog {
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 20px;
		max-width: 320px;
		background-color: var(--color-surface);
		color: var(--color-text);
	}

	/* サブメニューと同様に、縮小+ブラーから拡大しつつフェードして出入りする */
	/* 閉じる時はJS側でclose()を遅らせ、data-closingの退出スタイルへ遷移させる */
	dialog[open] {
		opacity: 1;
		transform: scale(1);
		filter: blur(0);
		transition:
			opacity 250ms ease,
			transform 250ms ease,
			filter 250ms ease;
	}

	@starting-style {
		dialog[open] {
			opacity: 0;
			transform: scale(0.9);
			filter: blur(4px);
		}
	}

	dialog[open][data-closing='true'] {
		opacity: 0;
		transform: scale(0.9);
		filter: blur(4px);
	}

	dialog::backdrop {
		background-color: var(--color-scrim);
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

	h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	p {
		margin: 15px 0;
		font-size: 1rem;
		overflow-wrap: anywhere;
		color: var(--color-text-muted);
	}

	div {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}
</style>
