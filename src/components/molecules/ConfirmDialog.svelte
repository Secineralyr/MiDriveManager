<script lang="ts">
	import Button from '$components/atoms/Button.svelte';

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

	$effect(() => {
		if (dialog === null) {
			return;
		}
		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	/** Escキーなどでダイアログが閉じられた時にキャンセル扱いにする */
	const handleClose = () => {
		if (open) {
			oncancel();
		}
	};
</script>

<dialog bind:this={dialog} onclose={handleClose}>
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

	dialog::backdrop {
		background-color: var(--color-scrim);
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
