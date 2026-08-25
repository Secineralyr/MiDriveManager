<script module lang="ts">
	import CheckboxControl from '$components/atoms/CheckboxControl.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'atoms/CheckboxControl',
		component: CheckboxControl,
	});
</script>

<Story name="未チェック" args={{ checked: false, label: '項目を選択', ontoggle: () => {} }} />

<Story name="チェック済み" args={{ checked: true, label: '項目を選択', ontoggle: () => {} }} />

<Story
	name="大きめ(18px)"
	args={{ checked: true, label: '項目を選択', size: 18, ontoggle: () => {} }}
/>
