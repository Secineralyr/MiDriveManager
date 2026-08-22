<script module lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import DetailsPanel from '$components/organisms/DetailsPanel.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const sampleFile: FileRecord = {
		accountId: 'story',
		folderKey: '',
		id: 'f1',
		createdAt: '2026-08-21T12:30:00.000Z',
		name: 'がぞー.jpg',
		type: 'image/jpeg',
		md5: 'd41d8cd98f00b204e9800998ecf8427e',
		size: 1_536_000,
		isSensitive: false,
		blurhash: null,
		properties: {},
		url: 'https://misskey.example/files/f1',
		thumbnailUrl: '/pwa-192x192.png',
		comment: '旅行で撮った写真',
		folderId: null,
		userId: null,
	};

	const sampleFolder: FolderRecord = {
		accountId: 'story',
		parentKey: '',
		id: 'd1',
		createdAt: '2026-08-20T10:00:00.000Z',
		name: 'いろいろふぉるだ',
		parentId: null,
	};

	const { Story } = defineMeta({
		title: 'organisms/DetailsPanel',
		component: DetailsPanel,
	});
</script>

<Story
	name="ファイル選択"
	args={{
		target: { kind: 'file', file: sampleFile },
		selectionCount: 1,
		selectionSize: sampleFile.size,
		onclose: () => {},
		onpreview: () => {},
	}}
/>

<Story
	name="フォルダ選択"
	args={{
		target: { kind: 'folder', folder: sampleFolder },
		selectionCount: 1,
		selectionSize: 0,
		onclose: () => {},
		onpreview: () => {},
	}}
/>

<Story
	name="複数選択"
	args={{
		target: { kind: 'file', file: sampleFile },
		selectionCount: 5,
		selectionSize: 12_500_000,
		onclose: () => {},
		onpreview: () => {},
	}}
/>

<Story
	name="未選択"
	args={{
		target: null,
		selectionCount: 0,
		selectionSize: 0,
		onclose: () => {},
		onpreview: () => {},
	}}
/>
