<script module lang="ts">
	import type { FolderRecord } from '../../lib/db/schema';
	import MoveSheet from '$components/organisms/MoveSheet.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	/**
	 * story用のフォルダを作る
	 * @param id - フォルダID
	 * @param name - フォルダ名
	 * @param parentId - 親フォルダID(ルートはnull)
	 * @returns フォルダ
	 */
	const folder = (id: string, name: string, parentId: string | null): FolderRecord => ({
		accountId: 'story',
		parentKey: parentId ?? '',
		id,
		createdAt: '2026-08-20T10:00:00.000Z',
		name,
		parentId,
	});

	const childrenMap: Record<string, FolderRecord[]> = {
		'': [folder('d1', '写真', null), folder('d2', '動画', null)],
		d1: [folder('d11', '旅行', 'd1')],
	};

	const { Story } = defineMeta({
		title: 'organisms/MoveSheet',
		component: MoveSheet,
	});
</script>

<Story
	name="移動先の選択"
	args={{
		open: true,
		childrenMap,
		currentFolderId: null,
		items: [{ kind: 'file', id: 'f1' }],
		onclose: () => {},
		onmove: () => {},
	}}
/>

<Story
	name="フォルダ自身は選べない"
	args={{
		open: true,
		childrenMap,
		currentFolderId: null,
		items: [{ kind: 'folder', id: 'd1' }],
		onclose: () => {},
		onmove: () => {},
	}}
/>

<Story
	name="中央のダイアログ表示(タブレット)"
	args={{
		open: true,
		childrenMap,
		currentFolderId: null,
		items: [{ kind: 'file', id: 'f1' }],
		variant: 'dialog',
		onclose: () => {},
		onmove: () => {},
	}}
/>

<Story
	name="フォルダ作成ボタン付き"
	args={{
		open: true,
		childrenMap,
		currentFolderId: 'd1',
		items: [{ kind: 'file', id: 'f1' }],
		onclose: () => {},
		onmove: () => {},
		oncreatefolder: () => Promise.resolve(null),
	}}
/>
