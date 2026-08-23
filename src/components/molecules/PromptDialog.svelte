<script lang="ts">
	import Button from '$components/atoms/Button.svelte';
	import TextField from '$components/atoms/TextField.svelte';

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** ダイアログの見出し */
		title: string;
		/** 入力欄のラベル */
		label: string;
		/** 入力欄の初期値 */
		initialValue?: string;
		/** 確定ボタンのラベル */
		confirmLabel?: string;
		/** 実行中かどうか(確定ボタンが無効になる) */
		busy?: boolean;
		/** 確定時の処理(入力値を渡す) */
		onconfirm: (value: string) => void;
		/** キャンセル時の処理 */
		oncancel: () => void;
	};

	let {
		open,
		title,
		label,
		initialValue = '',
		confirmLabel = 'OK',
		busy = false,
		onconfirm,
		oncancel,
	}: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	let value = $state('');
	let inputError = $state<string | null>(null);

	$effect(() => {
		if (dialog === null) {
			return;
		}

		if (open && !dialog.open) {
			value = initialValue;
			inputError = null;
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

	/**
	 * フォーム送信時に入力値を検証して確定する
	 * @param event - フォーム送信イベント
	 */
	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();

		const trimmed = value.trim();
		if (trimmed === '') {
			inputError = '名前を入力してください';
			return;
		}

		inputError = null;
		onconfirm(trimmed);
	};
</script>

<dialog bind:this={dialog} onclose={handleClose}>
	<h2>{title}</h2>
	<form onsubmit={handleSubmit}>
		<TextField {label} bind:value error={inputError} />
		<div>
			<Button variant="text" onclick={oncancel}>キャンセル</Button>
			<Button type="submit" disabled={busy}>{confirmLabel}</Button>
		</div>
	</form>
</dialog>

<style>
	dialog {
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 20px;
		min-width: 320px;
		max-width: 420px;
		background-color: var(--color-surface);
		color: var(--color-text);
	}

	dialog::backdrop {
		background-color: var(--color-scrim);
	}

	h2 {
		margin: 0;
		margin-bottom: 15px;
		font-size: 1.15rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	div {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}
</style>
