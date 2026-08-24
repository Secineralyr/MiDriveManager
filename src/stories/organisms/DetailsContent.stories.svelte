<script module lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import DetailsContent from '$components/organisms/DetailsContent.svelte';
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
		title: 'organisms/DetailsContent',
		component: DetailsContent,
	});
</script>

<Story
	name="ファイル"
	args={{
		target: { kind: 'file', file: sampleFile },
		selectionCount: 1,
		selectionSize: sampleFile.size,
		onpreview: () => {},
		onrename: () => {},
		onsavemetadata: () => {},
	}}
/>

<Story
	name="フォルダ"
	args={{
		target: { kind: 'folder', folder: sampleFolder },
		selectionCount: 1,
		selectionSize: 0,
		onpreview: () => {},
		onrename: () => {},
		onsavemetadata: () => {},
	}}
/>

<Story
	name="複数選択"
	args={{
		target: { kind: 'file', file: sampleFile },
		selectionCount: 5,
		selectionSize: 12_500_000,
		onpreview: () => {},
		onrename: () => {},
		onsavemetadata: () => {},
	}}
/>
