<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** ボタンの説明(ツールチップと読み上げに使う) */
		label: string;
		/** 押下状態(トグルボタン用) */
		active?: boolean;
		/** 非活性かどうか */
		disabled?: boolean;
		/** クリック時の処理 */
		onclick?: () => void;
		/** 表示するアイコン */
		children: Snippet;
	};

	let { label, active = false, disabled = false, onclick, children }: Props = $props();

	/** クリックを外部ハンドラへ伝える(DOMイベントオブジェクトは渡さない) */
	const handleClick = () => {
		onclick?.();
	};
</script>

<button
	type="button"
	aria-label={label}
	title={label}
	aria-pressed={active}
	{disabled}
	onclick={handleClick}
	data-active={active}
>
	{@render children()}
</button>

<style>
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border: 0;
		border-radius: 9999px;
		background-color: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			background-color 250ms ease,
			color 250ms ease,
			scale 250ms ease;
	}

	button:hover {
		background-color: var(--color-surface-hover);
		color: var(--color-text);
	}

	button:active {
		scale: 0.9;
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	button[data-active='true'] {
		background-color: var(--color-surface-active);
		color: var(--color-text);
	}
</style>
