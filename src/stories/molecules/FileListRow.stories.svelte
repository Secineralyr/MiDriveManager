<script module lang="ts">
	import FileListRow from '$components/molecules/FileListRow.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/FileListRow',
		component: FileListRow,
	});
</script>

<Story
	name="ファイル行"
	args={{
		name: 'がぞー.jpg',
		createdAt: '2026-08-21T12:30:00.000Z',
		size: 1_536_000,
		mimeType: 'image/jpeg',
	}}
>
	{#snippet template(args)}
		<table>
			<tbody>
				<FileListRow {...args} />
			</tbody>
		</table>
	{/snippet}
</Story>

<Story
	name="フォルダ行"
	args={{
		folder: true,
		name: 'いろいろふぉるだ',
		createdAt: '2026-08-21T12:30:00.000Z',
		size: null,
		onopen: () => {},
	}}
>
	{#snippet template(args)}
		<table>
			<tbody>
				<FileListRow {...args} />
			</tbody>
		</table>
	{/snippet}
</Story>
