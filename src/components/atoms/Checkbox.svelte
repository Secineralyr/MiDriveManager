<script lang="ts">
	import CheckboxControl from '$components/atoms/CheckboxControl.svelte';

	type Props = {
		/** チェックボックスのラベル */
		label: string;
		/** チェック状態(バインド可能) */
		checked: boolean;
	};

	let { label, checked = $bindable() }: Props = $props();
</script>

<label>
	<CheckboxControl
		{checked}
		{label}
		ontoggle={() => {
			checked = !checked;
		}}
	/>
	<span aria-hidden="true">{label}</span>
</label>

<style>
	label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;
	}

	span {
		font-size: 1rem;
		color: var(--color-text);
	}
</style>
