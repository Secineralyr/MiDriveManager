<script module lang="ts">
	import SearchBox from '$components/molecules/SearchBox.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/SearchBox',
		component: SearchBox,
	});
</script>

<Story name="空" args={{ value: '', oninput: () => {}, onclear: () => {} }} />

<Story name="入力あり" args={{ value: 'がぞー', oninput: () => {}, onclear: () => {} }} />
