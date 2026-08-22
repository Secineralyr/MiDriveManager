<script module lang="ts">
	import FileGridCard from '$components/molecules/FileGridCard.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/FileGridCard',
		component: FileGridCard,
	});
</script>

<Story name="フォルダ" args={{ folder: true, name: 'いろいろふぉるだ', onopen: () => {} }}>
	{#snippet template(args)}
		<div style="max-width: 180px;">
			<FileGridCard {...args} />
		</div>
	{/snippet}
</Story>

<Story
	name="画像サムネイル"
	args={{ name: 'がぞー.jpg', mimeType: 'image/jpeg', thumbnailUrl: '/pwa-192x192.png' }}
>
	{#snippet template(args)}
		<div style="max-width: 180px;">
			<FileGridCard {...args} />
		</div>
	{/snippet}
</Story>

<Story name="その他ファイル" args={{ name: 'archive.zip', mimeType: 'application/zip' }}>
	{#snippet template(args)}
		<div style="max-width: 180px;">
			<FileGridCard {...args} />
		</div>
	{/snippet}
</Story>
