<script module lang="ts">
	import Button from '$components/atoms/Button.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'atoms/Button',
		component: Button,
	});
</script>

<Story name="Filled">
	{#snippet template(args)}
		<Button variant={args.variant} disabled={args.disabled}>保存</Button>
	{/snippet}
</Story>

<Story name="Tonal" args={{ variant: 'tonal' }}>
	{#snippet template(args)}
		<Button variant={args.variant} disabled={args.disabled}>キャンセル</Button>
	{/snippet}
</Story>

<Story name="Text" args={{ variant: 'text' }}>
	{#snippet template(args)}
		<Button variant={args.variant} disabled={args.disabled}>閉じる</Button>
	{/snippet}
</Story>

<Story name="Danger" args={{ variant: 'danger' }}>
	{#snippet template(args)}
		<Button variant={args.variant} disabled={args.disabled}>削除</Button>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<Button variant={args.variant} disabled={args.disabled}>保存</Button>
	{/snippet}
</Story>
