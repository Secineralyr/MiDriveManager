<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** ボタンの見た目の種類 */
		variant?: 'filled' | 'tonal' | 'text' | 'danger';
		/** ボタンのtype属性 */
		type?: 'button' | 'submit';
		/** 非活性かどうか */
		disabled?: boolean;
		/** クリック時の処理 */
		onclick?: () => void;
		/** ボタンの中身 */
		children: Snippet;
	};

	let { variant = 'filled', type = 'button', disabled = false, onclick, children }: Props = $props();

	/** クリックを外部ハンドラへ伝える(DOMイベントオブジェクトは渡さない) */
	const handleClick = () => {
		onclick?.();
	};
</script>

<button {type} {disabled} onclick={handleClick} data-variant={variant}>
	{@render children()}
</button>

<style>
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 8px 20px;
		border: 0;
		border-radius: 9999px;
		gap: 5px;
		background-color: var(--color-accent);
		font-family: inherit;
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.5;
		color: var(--color-on-accent);
		cursor: pointer;
		transition:
			background-color 250ms ease,
			opacity 250ms ease,
			scale 250ms ease;
	}

	button:hover {
		opacity: 0.85;
	}

	button:active {
		scale: 0.95;
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	button[data-variant='tonal'] {
		background-color: var(--color-surface-active);
		color: var(--color-text);
	}

	button[data-variant='text'] {
		background-color: transparent;
		font-weight: 400;
		color: var(--color-text);
	}

	button[data-variant='text']:hover {
		background-color: var(--color-surface-hover);
		opacity: 1;
	}

	button[data-variant='danger'] {
		background-color: var(--color-danger);
		color: hsl(0 0% 100%);
	}
</style>
