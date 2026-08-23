<script module lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import type { ComponentProps } from 'svelte';
	import DriveExplorer from '$components/organisms/DriveExplorer.svelte';
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
		createdAt: '2026-08-20T10:00:00.000Z',
		name,
		parentId,
	});

	/**
	 * ストーリー用のファイルを作る
	 * @param file - ファイルのID・名前・MIMEタイプ・サムネイルURL
	 * @returns ファイルキャッシュレコード
	 */
	const makeFile = (file: {
		id: string;
		name: string;
		mimeType: string;
		thumbnailUrl: string | null;
	}): FileRecord => ({
		accountId: 'story',
		folderKey: '',
		id: file.id,
		createdAt: '2026-08-21T12:30:00.000Z',
		name: file.name,
		type: file.mimeType,
		md5: 'd41d8cd98f00b204e9800998ecf8427e',
		size: 1_536_000,
		isSensitive: false,
		blurhash: null,
		properties: {},
		url: `https://misskey.example/files/${file.id}`,
		thumbnailUrl: file.thumbnailUrl,
		comment: null,
		folderId: null,
		userId: null,
	});

	const allFolders = [
		makeFolder('d1', 'いろいろふぉるだ', null),
		makeFolder('d2', 'いろいろふぉるだ2', null),
		makeFolder('d3', '写真', 'd1'),
	];

	const childrenMap = buildChildrenMap(allFolders);

	const rootFolders = allFolders.filter((folder) => folder.parentId === null);

	const sampleImage = makeFile({
		id: 'f1',
		name: 'がぞー.jpg',
		mimeType: 'image/jpeg',
		thumbnailUrl: '/pwa-192x192.png',
	});

	const files = [
		sampleImage,
		makeFile({ id: 'f2', name: 'どうが.mp4', mimeType: 'video/mp4', thumbnailUrl: null }),
		makeFile({ id: 'f3', name: 'めも.txt', mimeType: 'text/plain', thumbnailUrl: null }),
	];

	/** すべてのハンドラーを何もしない関数で埋めた既定のargs */
	const baseArgs: ComponentProps<typeof DriveExplorer> = {
		childrenMap,
		currentFolderId: null,
		breadcrumb: [],
		folders: rootFolders,
		files,
		viewMode: 'list',
		sortKey: 'name',
		sortOrder: 'asc',
		selectedKeys: [],
		detailTarget: null,
		detailsOpen: false,
		selectionSize: 0,
		onnavigate: () => {},
		onsort: () => {},
		onviewmode: () => {},
		onselectitem: () => {},
		onclearselection: () => {},
		onclosedetails: () => {},
		onpreviewfile: () => {},
		oncreatefolder: () => {},
		onrename: () => {},
		onsavemetadata: () => {},
		ondeleteselection: () => {},
		actionBusy: false,
		ondragstartitem: () => {},
		ondragenditem: () => {},
		ondropitems: () => {},
		ondropfiles: () => {},
		onuploadfiles: () => {},
	};

	const { Story } = defineMeta({
		title: 'organisms/DriveExplorer',
		component: DriveExplorer,
	});
</script>

<Story name="リスト表示" args={{ ...baseArgs }}>
	{#snippet template(args)}
		<div style="display: flex; height: 480px;">
			<DriveExplorer {...args} />
		</div>
	{/snippet}
</Story>

<Story name="グリッド表示" args={{ ...baseArgs, viewMode: 'grid' }}>
	{#snippet template(args)}
		<div style="display: flex; height: 480px;">
			<DriveExplorer {...args} />
		</div>
	{/snippet}
</Story>

<Story
	name="選択と詳細パネル"
	args={{
		...baseArgs,
		selectedKeys: ['file:f1'],
		detailTarget: { kind: 'file', file: sampleImage },
		detailsOpen: true,
		selectionSize: sampleImage.size,
	}}
>
	{#snippet template(args)}
		<div style="display: flex; height: 480px;">
			<DriveExplorer {...args} />
		</div>
	{/snippet}
</Story>
