<script module lang="ts">
	import Spinner from '$components/atoms/Spinner.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'atoms/Spinner',
		component: Spinner,
	});
</script>

<Story name="標準" />

<Story name="大きめ" args={{ size: 30 }} />
