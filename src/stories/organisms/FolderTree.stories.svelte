<script module lang="ts">
	import type { FolderRecord } from '../../lib/db/schema';
	import FolderTree from '$components/organisms/FolderTree.svelte';
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
		makeFolder('f2', 'いろいろふぉるだ2', null),
		makeFolder('f3', 'いろいろふぉるだ3', null),
		makeFolder('f4', '写真', 'f1'),
		makeFolder('f5', '動画', 'f1'),
		makeFolder('f6', 'アーカイブ', 'f4'),
	]);

	/** 10階層まで続く深いフォルダ構成(見切れ対策の確認用) */
	const deepFolders: FolderRecord[] = [];
	for (let level = 1; level <= 10; level += 1) {
		deepFolders.push(
			makeFolder(`deep${level}`, `${level}階層目のフォルダ`, level === 1 ? null : `deep${level - 1}`),
		);
	}
	const deepChildrenMap = buildChildrenMap(deepFolders);

	const { Story } = defineMeta({
		title: 'organisms/FolderTree',
		component: FolderTree,
	});
</script>

<Story
	name="階層あり"
	args={{ childrenMap, currentFolderId: 'f1', onnavigate: () => {}, ondropitems: () => {} }}
/>

<Story name="フォルダなし" args={{ childrenMap: {}, currentFolderId: null, onnavigate: () => {} }} />

<Story
	name="深い階層"
	args={{ childrenMap: deepChildrenMap, currentFolderId: 'deep10', onnavigate: () => {} }}
>
	{#snippet template(args)}
		<div style="max-width: 240px;">
			<FolderTree
				childrenMap={args.childrenMap}
				currentFolderId={args.currentFolderId}
				onnavigate={args.onnavigate}
			/>
		</div>
	{/snippet}
</Story>

<Story
	name="フォルダメニュー付き(右クリックで新しいフォルダ)"
	args={{
		childrenMap,
		currentFolderId: null,
		onnavigate: () => {},
		oncreatefolderat: () => {},
	}}
/>
