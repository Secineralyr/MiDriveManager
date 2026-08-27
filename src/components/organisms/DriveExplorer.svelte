<script lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import type { SortKey, SortOrder } from '../../lib/utils/drive-sort';
	import { acceptDragOver, dispatchDrop, dropKindOf } from '../../lib/utils/drop-target';
	import ActionSheet from '$components/molecules/ActionSheet.svelte';
	import type { DetailTarget } from '$components/organisms/DetailsPanel.svelte';
	import DetailsPanel from '$components/organisms/DetailsPanel.svelte';
	import DriveToolbar from '$components/organisms/DriveToolbar.svelte';
	import FileGrid from '$components/organisms/FileGrid.svelte';
	import FileList from '$components/organisms/FileList.svelte';
	import FolderTreePane from '$components/organisms/FolderTreePane.svelte';
	import PhoneActionBar from '$components/molecules/PhoneActionBar.svelte';
	import PhoneFileList from '$components/organisms/PhoneFileList.svelte';
	import type { SelectModifiers } from '../../lib/stores/selection.svelte';
	import SelectionBar from '$components/molecules/SelectionBar.svelte';
	import type { ViewMode } from '../../lib/db/settings';
	import { sortMenuItems } from '../../lib/utils/drive-sort';

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
		/** 誤操作になりうる経路(余白・背景クリック)からの選択解除(未指定ならonclearselectionを使う) */
		onrequestclearselection?: () => void;
		/** 詳細パネルを閉じる操作 */
		onclosedetails: () => void;
		/** デスクトップの詳細パネルの開閉トグル(ボタンはデスクトップでのみ表示) */
		ontoggledetails?: () => void;
		/** ファイルのプレビューを開く操作 */
		onpreviewfile: (file: FileRecord) => void;
		/** フォルダ作成開始時の処理 */
		oncreatefolder: () => void;
		/** ツリーのフォルダメニューからの新規フォルダ作成(対象の親フォルダIDを渡す) */
		oncreatefolderat?: (parentId: string | null) => void;
		/** 名前の変更を開始する操作 */
		onrename: () => void;
		/** メタデータ保存時の処理 */
		onsavemetadata: (metadata: {
			/** 説明(代替テキスト)。空欄はnull */
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
		/** スマートフォン表示かどうか(下から出るシートや下部のアクションバーを使う) */
		phone?: boolean;
		/** タブレット表示かどうか(操作はスマートフォンと同様だが、メニューやパネルは重ね表示を使う) */
		tablet?: boolean;
		/** 選択モード中かどうか(スマートフォン用) */
		selectMode?: boolean;
		/** 選択モードの開始・終了(スマートフォン用) */
		ontoggleselectmode?: () => void;
		/** 選択した項目の移動(移動先の選択)要求時の処理(スマートフォン用) */
		onmoveselection?: () => void;
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
		onrequestclearselection,
		onclosedetails,
		ontoggledetails,
		onpreviewfile,
		oncreatefolder,
		oncreatefolderat,
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
		phone = false,
		tablet = false,
		selectMode = false,
		ontoggleselectmode,
		onmoveselection,
	}: Props = $props();

	const touch = $derived(phone || tablet);

	/** 項目がない時の文言(検索中は結果なしの文言にする) */
	const emptyMessage = $derived(
		searchQuery === null ? 'このフォルダは空です' : '一致する項目はありません',
	);

	let sortOpen = $state(false);

	const sortItems = $derived(sortMenuItems(sortKey, sortOrder));

	/** 一覧領域内でOSファイルをドラッグしている深さ(子要素の出入りで増減するため数で持つ) */
	let fileDragDepth = $state(0);

	let treeOpen = $state(false);

	/**
	 * フォルダへ移動する(狭い画面のドロワーは閉じる)
	 * @param folderId - 移動先のフォルダID(ルートはnull)
	 */
	const handleTreeNavigate = (folderId: string | null) => {
		treeOpen = false;
		onnavigate(folderId);
	};

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

	/**
	 * 一覧の余白(項目以外)のクリックで選択を解除する
	 * @param event - マウスイベント
	 */
	const handleAreaClick = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			(onrequestclearselection ?? onclearselection)();
		}
	};
</script>

<div class="workspace">
	<FolderTreePane
		{childrenMap}
		{currentFolderId}
		open={treeOpen}
		onnavigate={handleTreeNavigate}
		{ondropitems}
		{ondropfiles}
		{oncreatefolderat}
		{phone}
		onclose={() => {
			treeOpen = false;
		}}
	/>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -- OSファイルのドロップを一覧全体で受けるためのドラッグ操作 -->
	<main
		data-tour="list"
		data-actionbar={phone && selectMode}
		data-dropover={fileDragDepth > 0}
		ondragenter={handleAreaDragEnter}
		ondragleave={handleAreaDragLeave}
		ondragover={handleAreaDragOver}
		ondrop={handleAreaDrop}
		ondropcapture={resetAreaDrag}
	>
		<!-- 選択中はツールバーの枠ごと選択バーに置き換え、一覧の位置がずれないようにする(スマートフォンは下部のアクションバー、タブレットは選択モード中だけ) -->
		<div>
			{#if selectedKeys.length > 0 && !phone && (!tablet || selectMode)}
				<SelectionBar
					count={selectedKeys.length}
					ondownload={ondownloadselection}
					ondelete={ondeleteselection}
					onclear={tablet ? () => ontoggleselectmode?.() : onclearselection}
					onmove={onmoveselection}
					clearLabel={tablet ? '選択を終了' : '選択を解除'}
					{detailsOpen}
					{ontoggledetails}
				/>
			{:else}
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
					ondropitems={ondropitems}
					ondropfiles={ondropfiles}
					ontoggletree={() => {
						treeOpen = !treeOpen;
					}}
					{selectMode}
					ontoggleselect={ontoggleselectmode}
					onopensort={() => {
						sortOpen = true;
					}}
					{sortKey}
					{sortOrder}
					{onsort}
					{phone}
					{detailsOpen}
					{ontoggledetails}
				/>
			{/if}
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -- 一覧の余白クリックでの選択解除は補助操作(Escキーでも解除できる) -->
		<div onclick={handleAreaClick}>
			{#if phone && viewMode === 'list'}
				<PhoneFileList
					{folders}
					{files}
					{selectedKeys}
					{selectMode}
					onselecttoggle={(kind, id) => {
						onselectitem(kind, id, { toggle: true, range: false });
					}}
					onopenfolder={onnavigate}
					{onpreviewfile}
					{onopenmenu}
					{emptyMessage}
				/>
			{:else if viewMode === 'list'}
				<FileList
					{folders}
					{files}
					{sortKey}
					{sortOrder}
					{selectedKeys}
					{touch}
					{selectMode}
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
					{touch}
					{selectMode}
					dragEnabled={!phone}
					{onselectitem}
					onopenfolder={onnavigate}
					{onpreviewfile}
					{ondragstartitem}
					{ondragenditem}
					ondropinfolder={ondropitems}
					ondropfilesinfolder={ondropfiles}
					{onopenmenu}
					{emptyMessage}
					onbackgroundclick={onrequestclearselection ?? onclearselection}
				/>
			{/if}
		</div>
	</main>
	{#if detailsOpen && !phone}
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
	{#if phone && selectMode}
		<PhoneActionBar
			count={selectedKeys.length}
			onmove={() => {
				onmoveselection?.();
			}}
			ondownload={ondownloadselection}
			ondelete={ondeleteselection}
		/>
	{/if}
</div>

<ActionSheet
	open={sortOpen}
	title="並び替え"
	items={sortItems}
	onselect={onsort}
	onclose={() => {
		sortOpen = false;
	}}
/>

<style>
	.workspace {
		display: flex;
		position: relative;
		flex: 1;
		min-height: 0;
		/* 詳細パネルがスライドで右へはみ出す間、横スクロールを出さない */
		overflow: hidden;
	}

	main {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	/* ツールバーと選択バーの共通枠 */
	main > div:first-of-type {
		display: flex;
		flex-shrink: 0;
		flex-direction: column;
		justify-content: center;
		padding: 20px;
		padding-bottom: 15px;
		min-height: 75px;
	}

	/* 一覧のスクロール領域 */
	main > div:last-of-type {
		display: flex;
		flex: 1;
		flex-direction: column;
		overflow-y: auto;
		padding: 0 20px;
		padding-bottom: calc(20px + env(safe-area-inset-bottom));
		min-height: 0;
		min-width: 0;
		/* スクロールバーの出入りで幅が変わり、グリッドの列数が振動しないように常に領域を確保する */
		scrollbar-gutter: stable;
		/* 端まで来てもページ側へスクロールを連鎖させない */
		overscroll-behavior: contain;
	}

	/* タッチ端末では選択バーを大きくしている(44px)ため、枠も揃えて切り替え時に一覧がズレないようにする */
	@media (pointer: coarse) {
		main > div:first-of-type {
			min-height: 80px;
		}
	}

	/* スマートフォンはツールバーが2段で詰まって見えるため一覧との間隔を広げる */
	@media (max-width: 640px) {
		main > div:first-of-type {
			min-height: 80px;
		}
	}

	@media (pointer: coarse) and (max-width: 640px) {
		main > div:first-of-type {
			min-height: 84px;
		}
	}

	main[data-dropover='true'] {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}

	/* 下部のアクションバーが一覧の末尾に重ならないように余白を確保する */
	main[data-actionbar='true'] > div:last-of-type {
		padding-bottom: calc(80px + env(safe-area-inset-bottom));
	}

</style>
