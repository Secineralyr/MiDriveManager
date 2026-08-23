<script module lang="ts">
	import Checkbox from '$components/atoms/Checkbox.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'atoms/Checkbox',
		component: Checkbox,
	});
</script>

<Story name="未チェック" args={{ label: 'センシティブ', checked: false }} />

<Story name="チェック済み" args={{ label: 'センシティブ', checked: true }} />
