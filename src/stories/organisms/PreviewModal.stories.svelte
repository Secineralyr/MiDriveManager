<script module lang="ts">
	import type { FileRecord } from '../../lib/db/schema';
	import PreviewModal from '$components/organisms/PreviewModal.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	/**
	 * ストーリー用のファイルを作る
	 * @param file - ファイルの名前とMIMEタイプ
	 * @returns ファイルキャッシュレコード
	 */
	const makeFile = (file: { name: string; mimeType: string }): FileRecord => ({
		accountId: 'story',
		folderKey: '',
		id: 'f1',
		createdAt: '2026-08-21T12:30:00.000Z',
		name: file.name,
		type: file.mimeType,
		md5: 'd41d8cd98f00b204e9800998ecf8427e',
		size: 1_536_000,
		isSensitive: false,
		blurhash: null,
		properties: {},
		url: '/pwa-512x512.png',
		thumbnailUrl: null,
		comment: null,
		folderId: null,
		userId: null,
	});

	const { Story } = defineMeta({
		title: 'organisms/PreviewModal',
		component: PreviewModal,
	});
</script>

<Story
	name="画像"
	args={{
		file: makeFile({ name: 'がぞー.png', mimeType: 'image/png' }),
		onclose: () => {},
		ondownload: () => {},
	}}
/>

<Story
	name="画像(隣接ナビゲーション)"
	args={{
		file: makeFile({ name: 'がぞー.png', mimeType: 'image/png' }),
		files: [
			{ ...makeFile({ name: 'まえ.png', mimeType: 'image/png' }), id: 'f0' },
			makeFile({ name: 'がぞー.png', mimeType: 'image/png' }),
			{ ...makeFile({ name: 'つぎ.png', mimeType: 'image/png' }), id: 'f2' },
		],
		onnavigate: () => {},
		onclose: () => {},
		ondownload: () => {},
	}}
/>

<Story
	name="プレビュー不可"
	args={{ file: makeFile({ name: 'archive.zip', mimeType: 'application/zip' }), onclose: () => {} }}
/>
