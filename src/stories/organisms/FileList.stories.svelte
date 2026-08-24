<script module lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import FileList from '$components/organisms/FileList.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	/**
	 * ストーリー用のフォルダを作る
	 * @param id - フォルダID
	 * @param name - フォルダ名
	 * @returns フォルダキャッシュレコード
	 */
	const makeFolder = (id: string, name: string): FolderRecord => ({
		accountId: 'story',
		parentKey: '',
		id,
		createdAt: '2026-08-20T10:00:00.000Z',
		name,
		parentId: null,
	});

	/**
	 * ストーリー用のファイルを作る
	 * @param file - ファイルのID・名前・MIMEタイプ・サイズ
	 * @returns ファイルキャッシュレコード
	 */
	const makeFile = (file: {
		id: string;
		name: string;
		mimeType: string;
		size: number;
	}): FileRecord => ({
		accountId: 'story',
		folderKey: '',
		id: file.id,
		createdAt: '2026-08-21T12:30:00.000Z',
		name: file.name,
		type: file.mimeType,
		md5: 'd41d8cd98f00b204e9800998ecf8427e',
		size: file.size,
		isSensitive: false,
		blurhash: null,
		properties: {},
		url: `https://misskey.example/files/${file.id}`,
		thumbnailUrl: null,
		comment: null,
		folderId: null,
		userId: null,
	});

	const folders = [
		makeFolder('d1', 'いろいろふぉるだ'),
		makeFolder('d2', 'いろいろふぉるだ2'),
		makeFolder('d3', 'いろいろふぉるだ3'),
	];

	const files = [
		makeFile({ id: 'f1', name: 'がぞー.jpg', mimeType: 'image/jpeg', size: 1_536_000 }),
		makeFile({ id: 'f2', name: 'どうが.mp4', mimeType: 'video/mp4', size: 52_428_800 }),
		makeFile({ id: 'f3', name: 'めも.txt', mimeType: 'text/plain', size: 850 }),
	];

	const { Story } = defineMeta({
		title: 'organisms/FileList',
		component: FileList,
	});
</script>

<Story
	name="一覧"
	args={{
		folders,
		files,
		sortKey: 'name',
		sortOrder: 'asc',
		selectedKeys: [],
		onsort: () => {},
		onselectitem: () => {},
		onopenfolder: () => {},
		onpreviewfile: () => {},
	}}
/>

<Story
	name="選択あり"
	args={{
		folders,
		files,
		sortKey: 'name',
		sortOrder: 'asc',
		selectedKeys: ['folder:d1', 'file:f1'],
		onsort: () => {},
		onselectitem: () => {},
		onopenfolder: () => {},
		onpreviewfile: () => {},
	}}
/>

<Story
	name="空のフォルダ"
	args={{
		folders: [],
		files: [],
		sortKey: 'name',
		sortOrder: 'asc',
		selectedKeys: [],
		onsort: () => {},
		onselectitem: () => {},
		onopenfolder: () => {},
		onpreviewfile: () => {},
	}}
/>

<Story
	name="タッチ操作(選択モード)"
	args={{
		folders,
		files,
		sortKey: 'name',
		sortOrder: 'asc',
		selectedKeys: ['file:f1'],
		touch: true,
		selectMode: true,
		onsort: () => {},
		onselectitem: () => {},
		onopenfolder: () => {},
		onpreviewfile: () => {},
	}}
/>
