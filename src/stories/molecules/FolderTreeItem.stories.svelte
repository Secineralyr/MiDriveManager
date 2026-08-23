<script module lang="ts">
	import type { FolderRecord } from '../../lib/db/schema';
	import FolderTreeItem from '$components/molecules/FolderTreeItem.svelte';
	import { buildChildrenMap } from '../../lib/services/folder-tree';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	/**
	 * ストーリー用のフォルダを作る
	 * @param id - フォルダID
	 * @param name - フォルダ名
	 * @param parentId - 親フォルダID
	 * @returns フォルダキャッシュレコード
	 */
	const makeFolder = (id: string, name: string, parentId: string | null): FolderRecord => ({
		accountId: 'story',
		parentKey: parentId ?? '',
		id,
		createdAt: '2026-08-21T00:00:00.000Z',
		name,
		parentId,
	});

	const rootFolder = makeFolder('f1', 'いろいろふぉるだ', null);

	const childrenMap = buildChildrenMap([
		rootFolder,
		makeFolder('f2', '写真', 'f1'),
		makeFolder('f3', '動画', 'f1'),
	]);

	const { Story } = defineMeta({
		title: 'molecules/FolderTreeItem',
		component: FolderTreeItem,
	});
</script>

<Story
	name="折りたたみ"
	args={{
		folder: rootFolder,
		childrenMap,
		expanded: {},
		currentFolderId: null,
		ontoggle: () => {},
		onselect: () => {},
	}}
>
	{#snippet template(args)}
		<ul style="list-style: none; margin: 0; padding: 0;">
			<FolderTreeItem {...args} />
		</ul>
	{/snippet}
</Story>

<Story
	name="展開"
	args={{
		folder: rootFolder,
		childrenMap,
		expanded: { f1: true },
		currentFolderId: null,
		ontoggle: () => {},
		onselect: () => {},
	}}
>
	{#snippet template(args)}
		<ul style="list-style: none; margin: 0; padding: 0;">
			<FolderTreeItem {...args} />
		</ul>
	{/snippet}
</Story>

<Story
	name="選択中"
	args={{
		folder: rootFolder,
		childrenMap,
		expanded: {},
		currentFolderId: 'f1',
		ontoggle: () => {},
		onselect: () => {},
	}}
>
	{#snippet template(args)}
		<ul style="list-style: none; margin: 0; padding: 0;">
			<FolderTreeItem {...args} />
		</ul>
	{/snippet}
</Story>

<Story
	name="ドロップ受け入れ"
	args={{
		folder: rootFolder,
		childrenMap,
		expanded: {},
		currentFolderId: null,
		ontoggle: () => {},
		onselect: () => {},
		ondropitems: () => {},
	}}
>
	{#snippet template(args)}
		<ul style="list-style: none; margin: 0; padding: 0;">
			<FolderTreeItem {...args} />
		</ul>
	{/snippet}
</Story>
