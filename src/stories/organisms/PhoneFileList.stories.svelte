<script module lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import PhoneFileList from '$components/organisms/PhoneFileList.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const sampleFolders: FolderRecord[] = [
		{
			accountId: 'story',
			parentKey: '',
			id: 'd1',
			createdAt: '2026-08-20T10:00:00.000Z',
			name: 'いろいろふぉるだ',
			parentId: null,
		},
	];

	const sampleFiles: FileRecord[] = [
		{
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
			comment: null,
			folderId: null,
			userId: null,
		},
		{
			accountId: 'story',
			folderKey: '',
			id: 'f2',
			createdAt: '2026-08-22T09:00:00.000Z',
			name: 'おんせい.mp3',
			type: 'audio/mpeg',
			md5: 'd41d8cd98f00b204e9800998ecf8427f',
			size: 4_200_000,
			isSensitive: false,
			blurhash: null,
			properties: {},
			url: 'https://misskey.example/files/f2',
			thumbnailUrl: null,
			comment: null,
			folderId: null,
			userId: null,
		},
	];

	const { Story } = defineMeta({
		title: 'organisms/PhoneFileList',
		component: PhoneFileList,
	});
</script>

<Story
	name="通常"
	args={{
		folders: sampleFolders,
		files: sampleFiles,
		selectedKeys: [],
		selectMode: false,
		onselecttoggle: () => {},
		onopenfolder: () => {},
		onpreviewfile: () => {},
	}}
/>

<Story
	name="選択モード"
	args={{
		folders: sampleFolders,
		files: sampleFiles,
		selectedKeys: ['file:f1'],
		selectMode: true,
		onselecttoggle: () => {},
		onopenfolder: () => {},
		onpreviewfile: () => {},
	}}
/>

<Story
	name="空のフォルダ"
	args={{
		folders: [],
		files: [],
		selectedKeys: [],
		selectMode: false,
		onselecttoggle: () => {},
		onopenfolder: () => {},
		onpreviewfile: () => {},
	}}
/>
