<script module lang="ts">
	import DriveToolbar from '$components/organisms/DriveToolbar.svelte';
	import type { FolderRecord } from '../../lib/db/schema';
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
		createdAt: '2026-08-21T00:00:00.000Z',
		name,
		parentId: null,
	});

	const breadcrumb = [makeFolder('f1', 'いろいろふぉるだ'), makeFolder('f2', '写真')];

	const { Story } = defineMeta({
		title: 'organisms/DriveToolbar',
		component: DriveToolbar,
	});
</script>

<Story
	name="リスト表示"
	args={{
		breadcrumb,
		viewMode: 'list',
		onnavigate: () => {},
		onviewmode: () => {},
		oncreatefolder: () => {},
		onuploadfiles: () => {},
	}}
/>

<Story
	name="グリッド表示"
	args={{
		breadcrumb,
		viewMode: 'grid',
		onnavigate: () => {},
		onviewmode: () => {},
		oncreatefolder: () => {},
		onuploadfiles: () => {},
	}}
/>

<Story
	name="検索結果"
	args={{
		breadcrumb,
		viewMode: 'list',
		onnavigate: () => {},
		onviewmode: () => {},
		oncreatefolder: () => {},
		onuploadfiles: () => {},
		searchQuery: 'がぞー',
		resultCount: 3,
		onclearsearch: () => {},
	}}
/>
