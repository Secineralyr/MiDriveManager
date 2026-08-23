<script module lang="ts">
	import ViewModeSwitch from '$components/molecules/ViewModeSwitch.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/ViewModeSwitch',
		component: ViewModeSwitch,
	});
</script>

<Story name="リスト" args={{ viewMode: 'list', onchange: () => {} }} />

<Story name="グリッド" args={{ viewMode: 'grid', onchange: () => {} }} />
