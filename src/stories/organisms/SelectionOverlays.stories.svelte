<script module lang="ts">
	import type { FileRecord } from '../../lib/db/schema';
	import SelectionOverlays from '$components/organisms/SelectionOverlays.svelte';
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
		comment: null,
		folderId: null,
		userId: null,
	};

	/** 各storyで共通の操作系プロパティ */
	const handlers = {
		onclosemenu: () => {},
		onaction: () => {},
		onclosedetails: () => {},
		onpreview: () => {},
		onrename: () => {},
		onsavemetadata: () => {},
	};

	const { Story } = defineMeta({
		title: 'organisms/SelectionOverlays',
		component: SelectionOverlays,
	});
</script>

<Story
	name="スマートフォンのアクションシート"
	args={{
		phone: true,
		menuPosition: { x: 0, y: 0 },
		targets: [{ kind: 'file', id: 'f1' }],
		title: 'がぞー.jpg',
		detailsOpen: false,
		detailTarget: null,
		selectionCount: 1,
		selectionSize: sampleFile.size,
		actionBusy: false,
		...handlers,
	}}
/>

<Story
	name="スマートフォンの詳細シート"
	args={{
		phone: true,
		menuPosition: null,
		targets: [{ kind: 'file', id: 'f1' }],
		title: 'がぞー.jpg',
		detailsOpen: true,
		detailTarget: { kind: 'file', file: sampleFile },
		selectionCount: 1,
		selectionSize: sampleFile.size,
		actionBusy: false,
		...handlers,
	}}
/>

<Story
	name="デスクトップのコンテキストメニュー"
	args={{
		phone: false,
		menuPosition: { x: 40, y: 40 },
		targets: [{ kind: 'file', id: 'f1' }],
		title: 'がぞー.jpg',
		detailsOpen: false,
		detailTarget: null,
		selectionCount: 1,
		selectionSize: sampleFile.size,
		actionBusy: false,
		...handlers,
	}}
/>
