<script module lang="ts">
	import AboutDialog from '$components/molecules/AboutDialog.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/AboutDialog',
		component: AboutDialog,
	});
</script>

<Story
	name="標準"
	args={{
		open: true,
		onclose: () => {},
	}}
/>
