<script module lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import FileGrid from '$components/organisms/FileGrid.svelte';
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

	const folders = [makeFolder('d1', 'いろいろふぉるだ'), makeFolder('d2', '写真')];

	const files = [
		makeFile({ id: 'f1', name: 'がぞー.jpg', mimeType: 'image/jpeg', thumbnailUrl: '/pwa-192x192.png' }),
		makeFile({ id: 'f2', name: 'どうが.mp4', mimeType: 'video/mp4', thumbnailUrl: null }),
		makeFile({ id: 'f3', name: 'めも.txt', mimeType: 'text/plain', thumbnailUrl: null }),
	];

	const { Story } = defineMeta({
		title: 'organisms/FileGrid',
		component: FileGrid,
	});
</script>

<Story name="一覧" args={{ folders, files, onopenfolder: () => {} }} />

<Story name="空のフォルダ" args={{ folders: [], files: [], onopenfolder: () => {} }} />
