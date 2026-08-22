<script module lang="ts">
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconList from '@tabler/icons-svelte/icons/list';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'atoms/IconButton',
		component: IconButton,
	});
</script>

<Story name="標準">
	{#snippet template(args)}
		<IconButton label="リスト表示" active={args.active} disabled={args.disabled}>
			<IconList size={18} />
		</IconButton>
	{/snippet}
</Story>

<Story name="アクティブ" args={{ active: true }}>
	{#snippet template(args)}
		<IconButton label="リスト表示" active={args.active} disabled={args.disabled}>
			<IconList size={18} />
		</IconButton>
	{/snippet}
</Story>

<Story name="非活性" args={{ disabled: true }}>
	{#snippet template(args)}
		<IconButton label="リスト表示" active={args.active} disabled={args.disabled}>
			<IconList size={18} />
		</IconButton>
	{/snippet}
</Story>
