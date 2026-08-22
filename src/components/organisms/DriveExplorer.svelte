<script lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import type { SortKey, SortOrder } from '../../lib/utils/drive-sort';
	import Breadcrumbs from '$components/molecules/Breadcrumbs.svelte';
	import FileGrid from '$components/organisms/FileGrid.svelte';
	import FileList from '$components/organisms/FileList.svelte';
	import FolderTree from '$components/organisms/FolderTree.svelte';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconLayoutGrid from '@tabler/icons-svelte/icons/layout-grid';
	import IconList from '@tabler/icons-svelte/icons/list';
	import type { ViewMode } from '../../lib/db/settings';

	type Props = {
		/** 親キーごとの子フォルダ一覧(ツリー用) */
		childrenMap: Record<string, FolderRecord[]>;
		/** 表示中のフォルダID(ルートはnull) */
		currentFolderId: string | null;
		/** ルートから表示中フォルダまでの経路 */
		breadcrumb: FolderRecord[];
		/** 表示中フォルダ直下のフォルダ(並び替え済み) */
		folders: FolderRecord[];
		/** 表示中フォルダ直下のファイル(並び替え済み) */
		files: FileRecord[];
		/** 表示モード */
		viewMode: ViewMode;
		/** 並び替えの基準 */
		sortKey: SortKey;
		/** 並び替えの方向 */
		sortOrder: SortOrder;
		/** エラーメッセージ(正常時はnull) */
		error: string | null;
		/** フォルダ移動時の処理 */
		onnavigate: (folderId: string | null) => void;
		/** 並び替え変更時の処理 */
		onsort: (key: SortKey) => void;
		/** 表示モード変更時の処理 */
		onviewmode: (mode: ViewMode) => void;
	};

	let {
		childrenMap,
		currentFolderId,
		breadcrumb,
		folders,
		files,
		viewMode,
		sortKey,
		sortOrder,
		error,
		onnavigate,
		onsort,
		onviewmode,
	}: Props = $props();

	const breadcrumbItems = $derived([
		{ id: null, name: 'ルート' },
		...breadcrumb.map((folder) => ({ id: folder.id, name: folder.name })),
	]);

	/**
	 * 一覧内のフォルダを開く
	 * @param folderId - 開くフォルダID
	 */
	const handleOpenFolder = (folderId: string) => {
		onnavigate(folderId);
	};
</script>

<div class="workspace">
	<aside>
		<FolderTree {childrenMap} {currentFolderId} {onnavigate} />
	</aside>
	<main>
		<div>
			<Breadcrumbs items={breadcrumbItems} {onnavigate} />
			<div>
				<IconButton
					label="リスト表示"
					active={viewMode === 'list'}
					onclick={() => {
						onviewmode('list');
					}}
				>
					<IconList size={18} />
				</IconButton>
				<IconButton
					label="グリッド表示"
					active={viewMode === 'grid'}
					onclick={() => {
						onviewmode('grid');
					}}
				>
					<IconLayoutGrid size={18} />
				</IconButton>
			</div>
		</div>
		{#if error !== null}
			<p role="alert">{error}</p>
		{/if}
		{#if viewMode === 'list'}
			<FileList {folders} {files} {sortKey} {sortOrder} {onsort} onopenfolder={handleOpenFolder} />
		{:else}
			<FileGrid {folders} {files} onopenfolder={handleOpenFolder} />
		{/if}
	</main>
</div>

<style>
	.workspace {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	aside {
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--color-outline-weak);
		min-width: 240px;
		max-width: 240px;
		overflow-y: auto;
	}

	main {
		display: flex;
		flex: 1;
		flex-direction: column;
		overflow-y: auto;
		padding: 20px;
		gap: 15px;
		min-width: 0;
	}

	main > div:first-of-type {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	main > div:first-of-type > div {
		display: flex;
		gap: 5px;
	}

	p[role='alert'] {
		margin: 0;
		color: var(--color-danger);
	}
</style>
