<script module lang="ts">
	import type { FolderRecord } from '../../lib/db/schema';
	import FolderTreePane from '$components/organisms/FolderTreePane.svelte';
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

	const childrenMap = buildChildrenMap([
		makeFolder('f1', 'いろいろふぉるだ', null),
		makeFolder('f2', '写真', 'f1'),
		makeFolder('f3', '動画', 'f1'),
	]);

	const { Story } = defineMeta({
		title: 'organisms/FolderTreePane',
		component: FolderTreePane,
	});
</script>

<Story name="幅の変更付き" args={{ childrenMap, currentFolderId: 'f1', onnavigate: () => {} }}>
	{#snippet template(args)}
		<div style="display: flex; min-height: 300px;">
			<FolderTreePane
				childrenMap={args.childrenMap}
				currentFolderId={args.currentFolderId}
				onnavigate={args.onnavigate}
			/>
			<p style="flex: 1; margin: 0; padding: 20px;">境界線をドラッグまたは矢印キーで幅を変える</p>
		</div>
	{/snippet}
</Story>
