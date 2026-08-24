<script module lang="ts">
	import PhoneFileItem from '$components/molecules/PhoneFileItem.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/PhoneFileItem',
		component: PhoneFileItem,
	});
</script>

<Story
	name="ファイル"
	args={{
		name: 'がぞー.jpg',
		createdAt: '2026-08-21T12:30:00.000Z',
		size: 1_536_000,
		mimeType: 'image/jpeg',
		thumbnailUrl: '/pwa-192x192.png',
		onopen: () => {},
	}}
>
	{#snippet template(args)}
		<ul style="margin: 0; padding: 0; list-style: none;">
			<PhoneFileItem {...args} />
		</ul>
	{/snippet}
</Story>

<Story
	name="フォルダ"
	args={{
		folder: true,
		name: 'いろいろふぉるだ',
		createdAt: '2026-08-20T10:00:00.000Z',
		size: null,
		onopen: () => {},
	}}
>
	{#snippet template(args)}
		<ul style="margin: 0; padding: 0; list-style: none;">
			<PhoneFileItem {...args} />
		</ul>
	{/snippet}
</Story>

<Story
	name="選択モード"
	args={{
		name: 'がぞー.jpg',
		createdAt: '2026-08-21T12:30:00.000Z',
		size: 1_536_000,
		mimeType: 'image/jpeg',
		selected: true,
		selectMode: true,
		onselecttoggle: () => {},
	}}
>
	{#snippet template(args)}
		<ul style="margin: 0; padding: 0; list-style: none;">
			<PhoneFileItem {...args} />
		</ul>
	{/snippet}
</Story>
