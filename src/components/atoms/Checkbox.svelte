<script lang="ts">
	type Props = {
		/** チェックボックスのラベル */
		label: string;
		/** チェック状態(バインド可能) */
		checked: boolean;
	};

	let { label, checked = $bindable() }: Props = $props();
</script>

<label>
	<input type="checkbox" bind:checked />
	<span>{label}</span>
</label>

<style>
	label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;
	}

	input {
		margin: 0;
		accent-color: var(--color-accent);
		inline-size: 16px;
		block-size: 16px;
		cursor: pointer;
	}

	input:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	span {
		font-size: 1rem;
		color: var(--color-text);
	}
</style>
