<script lang="ts">
	type Props = {
		/** 入力欄のラベル */
		label: string;
		/** 入力値(バインド可能) */
		value: string;
		/** プレースホルダー */
		placeholder?: string;
		/** 表示する行数 */
		rows?: number;
	};

	let { label, value = $bindable(), placeholder = '', rows = 3 }: Props = $props();
</script>

<label>
	<span>{label}</span>
	<textarea bind:value {placeholder} {rows}></textarea>
</label>

<style>
	label {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	span {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	textarea {
		border: 1px solid var(--color-outline);
		border-radius: 5px;
		padding: 10px 12px;
		background-color: var(--color-surface);
		font-family: inherit;
		font-size: 1rem;
		color: var(--color-text);
		resize: vertical;
		transition: border-color 250ms ease;
	}

	textarea:focus {
		border-color: var(--color-focus);
		outline: none;
	}
</style>
