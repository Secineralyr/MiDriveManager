<script lang="ts">
	type Props = {
		/** 入力欄のラベル */
		label: string;
		/** 入力値(バインド可能) */
		value: string;
		/** プレースホルダー */
		placeholder?: string;
		/** エラーメッセージ(nullなら非表示) */
		error?: string | null;
	};

	let { label, value = $bindable(), placeholder = '', error = null }: Props = $props();
</script>

<label>
	<span>{label}</span>
	<input type="text" bind:value {placeholder} />
	{#if error !== null && error !== ''}
		<small>{error}</small>
	{/if}
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

	input {
		padding: 10px 12px;
		border: 1px solid var(--color-outline);
		border-radius: 5px;
		background-color: var(--color-surface);
		font-family: inherit;
		font-size: 1rem;
		color: var(--color-text);
		transition: border-color 250ms ease;
	}

	input:focus {
		border-color: var(--color-focus);
		outline: none;
	}

	small {
		font-size: 0.85rem;
		color: var(--color-danger);
	}
</style>
