<script module lang="ts">
	import PhoneActionBar from '$components/molecules/PhoneActionBar.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/PhoneActionBar',
		component: PhoneActionBar,
	});
</script>

<Story name="未選択" args={{ count: 0, onmove: () => {}, ondownload: () => {}, ondelete: () => {} }} />

<Story name="複数選択" args={{ count: 3, onmove: () => {}, ondownload: () => {}, ondelete: () => {} }} />
