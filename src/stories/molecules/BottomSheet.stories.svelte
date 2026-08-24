<script module lang="ts">
	import BottomSheet from '$components/molecules/BottomSheet.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/BottomSheet',
		component: BottomSheet,
	});
</script>

<Story name="開いた状態" args={{ open: true, title: 'シートの見出し', onclose: () => {} }}>
	{#snippet template(args)}
		<BottomSheet open={args.open ?? false} title={args.title ?? ''} onclose={() => {}}>
			<p>シートの中身をここに表示する</p>
		</BottomSheet>
	{/snippet}
</Story>

<Story name="閉じた状態" args={{ open: false, title: 'シートの見出し', onclose: () => {} }}>
	{#snippet template(args)}
		<BottomSheet open={args.open ?? false} title={args.title ?? ''} onclose={() => {}}>
			<p>シートの中身をここに表示する</p>
		</BottomSheet>
	{/snippet}
</Story>

<Story name="中央のダイアログ表示" args={{ open: true, title: 'ダイアログ', onclose: () => {} }}>
	{#snippet template(args)}
		<BottomSheet open={args.open ?? false} title={args.title ?? ''} variant="dialog" onclose={() => {}}>
			<p>タブレットでは下からではなく中央に表示する</p>
		</BottomSheet>
	{/snippet}
</Story>
