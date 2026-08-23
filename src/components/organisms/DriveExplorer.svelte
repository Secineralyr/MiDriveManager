<script lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import type { SortKey, SortOrder } from '../../lib/utils/drive-sort';
	import { acceptDragOver, dispatchDrop, dropKindOf } from '../../lib/utils/drop-target';
	import type { DetailTarget } from '$components/organisms/DetailsPanel.svelte';
	import DetailsPanel from '$components/organisms/DetailsPanel.svelte';
	import DriveToolbar from '$components/organisms/DriveToolbar.svelte';
	import FileGrid from '$components/organisms/FileGrid.svelte';
	import FileList from '$components/organisms/FileList.svelte';
	import FolderTree from '$components/organisms/FolderTree.svelte';
	import type { SelectModifiers } from '../../lib/stores/selection.svelte';
	import SelectionBar from '$components/molecules/SelectionBar.svelte';
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
		/** 選択中の選択キー一覧 */
		selectedKeys: string[];
		/** 詳細パネルの表示対象 */
		detailTarget: DetailTarget | null;
		/** 詳細パネルを表示するかどうか */
		detailsOpen: boolean;
		/** 選択中ファイルの合計サイズ */
		selectionSize: number;
		/** フォルダ移動時の処理 */
		onnavigate: (folderId: string | null) => void;
		/** 並び替え変更時の処理 */
		onsort: (key: SortKey) => void;
		/** 表示モード変更時の処理 */
		onviewmode: (mode: ViewMode) => void;
		/** 項目が選択された時の処理 */
		onselectitem: (kind: 'file' | 'folder', id: string, modifiers: SelectModifiers) => void;
		/** 選択解除時の処理 */
		onclearselection: () => void;
		/** 詳細パネルを閉じる操作 */
		onclosedetails: () => void;
		/** ファイルのプレビューを開く操作 */
		onpreviewfile: (file: FileRecord) => void;
		/** フォルダ作成開始時の処理 */
		oncreatefolder: () => void;
		/** 名前の変更を開始する操作 */
		onrename: () => void;
		/** メタデータ保存時の処理 */
		onsavemetadata: (metadata: {
			/** コメント(代替テキスト)。空欄はnull */
			comment: string | null;
			/** センシティブフラグ */
			isSensitive: boolean;
		}) => void;
		/** 選択した項目の削除要求時の処理 */
		ondeleteselection: () => void;
		/** 操作の実行中かどうか */
		actionBusy: boolean;
		/** 項目のドラッグ開始時の処理 */
		ondragstartitem: (kind: 'file' | 'folder', id: string) => void;
		/** 項目のドラッグ終了時の処理 */
		ondragenditem: () => void;
		/** フォルダへの項目ドロップ時の処理 */
		ondropitems: (folderId: string | null) => void;
		/** フォルダへのOSファイルドロップ時の処理(一覧の余白へのドロップは表示中フォルダ宛て) */
		ondropfiles: (folderId: string | null, transfer: DataTransfer) => void;
		/** ツールバーのアップロードボタンでファイルが選ばれた時の処理 */
		onuploadfiles: (files: File[]) => void;
		/** 選択した項目のダウンロード要求時の処理 */
		ondownloadselection: () => void;
		/** 項目の右クリックでコンテキストメニューを開く操作 */
		onopenmenu: (kind: 'file' | 'folder', id: string, position: { x: number; y: number }) => void;
		/** 検索中の検索語(検索していない時はnull。検索中はfolders/filesが検索結果になる) */
		searchQuery: string | null;
		/** 検索解除時の処理 */
		onclearsearch: () => void;
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
		selectedKeys,
		detailTarget,
		detailsOpen,
		selectionSize,
		onnavigate,
		onsort,
		onviewmode,
		onselectitem,
		onclearselection,
		onclosedetails,
		onpreviewfile,
		oncreatefolder,
		onrename,
		onsavemetadata,
		ondeleteselection,
		actionBusy,
		ondragstartitem,
		ondragenditem,
		ondropitems,
		ondropfiles,
		onuploadfiles,
		ondownloadselection,
		onopenmenu,
		searchQuery,
		onclearsearch,
	}: Props = $props();

	/** 項目がない時の文言(検索中は結果なしの文言にする) */
	const emptyMessage = $derived(
		searchQuery === null ? 'このフォルダは空です' : '一致する項目はありません',
	);

	/** 一覧領域内でOSファイルをドラッグしている深さ(子要素の出入りで増減するため数で持つ) */
	let fileDragDepth = $state(0);

	/**
	 * OSファイルが一覧領域へ入った時に深さを増やす
	 * @param event - ドラッグイベント
	 */
	const handleAreaDragEnter = (event: DragEvent) => {
		if (dropKindOf(event.dataTransfer) === 'files') {
			fileDragDepth += 1;
		}
	};

	/**
	 * OSファイルが一覧領域(または子要素)から出た時に深さを減らす
	 * @param event - ドラッグイベント
	 */
	const handleAreaDragLeave = (event: DragEvent) => {
		if (dropKindOf(event.dataTransfer) === 'files') {
			fileDragDepth = Math.max(0, fileDragDepth - 1);
		}
	};

	/**
	 * 一覧領域はOSファイルのドロップだけを受け入れる(フォルダ行などが先に受け取った場合はここへ来ない)
	 * 検索結果の表示中はドロップ先のフォルダが定まらないため受け入れない
	 * @param event - ドラッグイベント
	 */
	const handleAreaDragOver = (event: DragEvent) => {
		acceptDragOver(event, { items: false, files: searchQuery === null });
	};

	/**
	 * 一覧領域へドロップされたOSファイルを表示中フォルダ宛てとして受け取る
	 * @param event - ドラッグイベント
	 */
	const handleAreaDrop = (event: DragEvent) => {
		dispatchDrop(event, {
			onfiles: (transfer) => {
				ondropfiles(currentFolderId, transfer);
			},
		});
	};

	/** ドロップがどこで処理されても領域の強調を解除する(捕捉段階で呼ぶ) */
	const resetAreaDrag = () => {
		fileDragDepth = 0;
	};
</script>

<div class="workspace">
	<aside>
		<FolderTree {childrenMap} {currentFolderId} {onnavigate} {ondropitems} {ondropfiles} />
	</aside>
	<main
		data-dropover={fileDragDepth > 0}
		ondragenter={handleAreaDragEnter}
		ondragleave={handleAreaDragLeave}
		ondragover={handleAreaDragOver}
		ondrop={handleAreaDrop}
		ondropcapture={resetAreaDrag}
	>
		<DriveToolbar
			{breadcrumb}
			{viewMode}
			{onnavigate}
			{onviewmode}
			{oncreatefolder}
			{onuploadfiles}
			{searchQuery}
			resultCount={folders.length + files.length}
			{onclearsearch}
		/>
		{#if selectedKeys.length > 0}
			<SelectionBar
				count={selectedKeys.length}
				ondownload={ondownloadselection}
				ondelete={ondeleteselection}
				onclear={onclearselection}
			/>
		{/if}
		{#if viewMode === 'list'}
			<FileList
				{folders}
				{files}
				{sortKey}
				{sortOrder}
				{selectedKeys}
				{onsort}
				{onselectitem}
				onopenfolder={onnavigate}
				{onpreviewfile}
				{ondragstartitem}
				{ondragenditem}
				ondropinfolder={ondropitems}
				ondropfilesinfolder={ondropfiles}
				{onopenmenu}
				{emptyMessage}
			/>
		{:else}
			<FileGrid
				{folders}
				{files}
				{selectedKeys}
				{onselectitem}
				onopenfolder={onnavigate}
				{onpreviewfile}
				{ondragstartitem}
				{ondragenditem}
				ondropinfolder={ondropitems}
				ondropfilesinfolder={ondropfiles}
				{onopenmenu}
				{emptyMessage}
			/>
		{/if}
	</main>
	{#if detailsOpen}
		<DetailsPanel
			target={detailTarget}
			selectionCount={selectedKeys.length}
			{selectionSize}
			{actionBusy}
			onclose={onclosedetails}
			onpreview={onpreviewfile}
			{onrename}
			{onsavemetadata}
		/>
	{/if}
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

	main[data-dropover='true'] {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}
</style>
