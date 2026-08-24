<script module lang="ts">
	import SelectionBar from '$components/molecules/SelectionBar.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/SelectionBar',
		component: SelectionBar,
	});
</script>

<Story name="単一選択" args={{ count: 1, ondownload: () => {}, ondelete: () => {}, onclear: () => {} }} />

<Story name="複数選択" args={{ count: 12, ondownload: () => {}, ondelete: () => {}, onclear: () => {} }} />

<Story
	name="タブレットの選択モード(移動付き)"
	args={{
		count: 2,
		ondownload: () => {},
		ondelete: () => {},
		onclear: () => {},
		onmove: () => {},
		clearLabel: '選択を終了',
	}}
/>
