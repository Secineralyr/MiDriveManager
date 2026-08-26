<script lang="ts">
	import type { AccountRecord, FileRecord } from '../../lib/db/schema';
	import {
		detailTargetItem,
		detailTargetName,
		resolveDetailTarget,
	} from '../../lib/services/detail-target';
	import {
		makeSelectionKey,
		parseSelectionKey,
		selectionStore,
	} from '../../lib/stores/selection.svelte';
	import DriveActionDialogs from '$components/organisms/DriveActionDialogs.svelte';
	import DriveExplorer from '$components/organisms/DriveExplorer.svelte';
	import PreviewModal from '$components/organisms/PreviewModal.svelte';
	import SelectionOverlays from '$components/organisms/SelectionOverlays.svelte';
	import { createDriveDrag } from '../../lib/stores/drive-drag';
	import { createDriveShortcuts } from '../../lib/stores/drive-shortcuts';
	import { driveActionsStore } from '../../lib/stores/drive-actions.svelte';
	import { driveStore } from '../../lib/stores/drive.svelte';
	import { driveTasks } from '../../lib/stores/drive-tasks';
	import { searchStore } from '../../lib/stores/search.svelte';
	import { syncStore } from '../../lib/stores/sync.svelte';
	import { viewportStore } from '../../lib/stores/viewport.svelte';

	type Props = {
		/** 表示するアカウント */
		account: AccountRecord;
	};

	let { account }: Props = $props();

	let previewFile = $state<FileRecord | null>(null);
	let detailsClosed = $state(false);
	let createOpen = $state(false);
	let renameOpen = $state(false);
	let deleteOpen = $state(false);
	let menuPosition = $state<{ x: number; y: number } | null>(null);
	let selectMode = $state(false);
	let detailsSheetOpen = $state(false);
	let moveOpen = $state(false);

	const phone = $derived(viewportStore.phone);
	const tablet = $derived(viewportStore.tablet);

	const touch = $derived(phone || tablet);

	const detailsPanelOpen = $derived.by(() => {
		if (phone) {
			return false;
		}

		if (tablet) {
			return detailsSheetOpen;
		}

		return effectiveKeys.length > 0 && !detailsClosed;
	});

	// 検索中は検索結果、それ以外は表示中フォルダの内容を一覧に出す(並び替えは共通)
	const searchResult = $derived(searchStore.active ? searchStore.result : null);
	const visibleFolders = $derived(
		searchResult === null
			? driveStore.childFolders
			: searchStore.sortedFolders(driveStore.sortKey, driveStore.sortOrder),
	);
	const visibleFiles = $derived(
		searchResult === null
			? driveStore.files
			: searchStore.sortedFiles(driveStore.sortKey, driveStore.sortOrder),
	);

	const orderedKeys = $derived([
		...visibleFolders.map((folder) => makeSelectionKey('folder', folder.id)),
		...visibleFiles.map((file) => makeSelectionKey('file', file.id)),
	]);

	const effectiveKeys = $derived(selectionStore.keys.filter((key) => orderedKeys.includes(key)));

	const detailTarget = $derived.by(() => {
		const lastKey = effectiveKeys.at(-1);
		return resolveDetailTarget({
			last: lastKey === undefined ? null : parseSelectionKey(lastKey),
			folders: visibleFolders,
			files: visibleFiles,
		});
	});

	const selectionSize = $derived(
		visibleFiles
			.filter((file) => effectiveKeys.includes(makeSelectionKey('file', file.id)))
			.reduce((sum, file) => sum + file.size, 0),
	);

	const renameInitial = $derived(detailTargetName(detailTarget));
	const renameItem = $derived(detailTargetItem(detailTarget));
	const deleteTargets = $derived(effectiveKeys.map((key) => parseSelectionKey(key)));

	const sheetTitle = $derived(
		effectiveKeys.length === 1 ? detailTargetName(detailTarget) : `${effectiveKeys.length}件選択`,
	);

	const shortcuts = createDriveShortcuts({
		account: () => account,
		orderedKeys: () => orderedKeys,
		effectiveKeys: () => effectiveKeys,
		blocked: () =>
			createOpen ||
			renameOpen ||
			deleteOpen ||
			previewFile !== null ||
			detailsSheetOpen ||
			moveOpen,
		openDelete: () => {
			deleteOpen = true;
		},
		openRename: () => {
			renameOpen = true;
		},
	});

	/**
	 * ファイルのメタデータ保存を実行する(成功時の再読み込みはストアが行う)
	 * @param metadata - 更新するメタデータ
	 */
	const handleSaveMetadata = (metadata: {
		/** 説明(代替テキスト)。空欄はnull */
		comment: string | null;
		/** センシティブフラグ */
		isSensitive: boolean;
	}) => {
		if (detailTarget?.kind === 'file') {
			driveActionsStore.saveFileMetadata(account, { fileId: detailTarget.file.id, metadata });
		}
	};

	/**
	 * 未選択の項目をその項目だけの選択にする(ドラッグ開始や右クリックの前処理)
	 * @param kind - 項目の種別
	 * @param id - 項目のID
	 */
	const selectIfUnselected = (kind: 'file' | 'folder', id: string) => {
		const key = makeSelectionKey(kind, id);
		if (!selectionStore.isSelected(key)) {
			selectionStore.click(key, { toggle: false, range: false }, orderedKeys);
		}
	};

	const drag = createDriveDrag({
		selectItem: selectIfUnselected,
		selectedKeys: () => selectionStore.keys,
		isMenuOpen: () => menuPosition !== null,
		closeMenu: () => {
			menuPosition = null;
		},
		moveItems: (items, targetFolderId) => {
			const _ = driveTasks.moveItems(account, { items, targetFolderId });
		},
		clearSelection: () => {
			selectionStore.clear();
		},
	});

	/**
	 * 右クリック(長押し)された項目を選択してコンテキストメニューを開く
	 * タブレットでは合わせて詳細パネルも開く
	 * @param kind - 項目の種別
	 * @param id - 項目のID
	 * @param position - 表示位置
	 */
	const handleOpenMenu = (kind: 'file' | 'folder', id: string, position: { x: number; y: number }) => {
		selectIfUnselected(kind, id);
		
		if (tablet) {
			detailsSheetOpen = true;
		}
		
		menuPosition = position;
	};

	/** 選択中の項目のダウンロードを操作キューへ積む */
	const downloadSelection = () => {
		driveTasks.download(account, deleteTargets);
	};

	/** 選択モードを切り替える(切り替え時に選択は解除する) */
	const toggleSelectMode = () => {
		selectionStore.clear();
		selectMode = !selectMode;
	};

	/**
	 * 選択中の項目の移動を操作キューへ積む(移動先シートを閉じ、選択モードも終了する)
	 * @param targetFolderId - 移動先のフォルダID(ルートはnull)
	 */
	const handleMoveSelection = (targetFolderId: string | null) => {
		moveOpen = false;
		const _ = driveTasks.moveItems(account, { items: deleteTargets, targetFolderId });
		selectionStore.clear();
		selectMode = false;
	};

	/**
	 * プレビュー中のファイルの詳細シートを開く(プレビューは閉じ、対象を選択状態にする)
	 * @param file - 対象のファイル
	 */
	const handlePreviewDetails = (file: FileRecord) => {
		previewFile = null;
		selectIfUnselected('file', file.id);
		detailsSheetOpen = true;
	};

	/**
	 * OSからドロップされたファイル・フォルダのアップロードを操作キューへ積む
	 * @param targetFolderId - ドロップ先のフォルダID(ルートはnull)
	 * @param transfer - ドロップされたデータ
	 */
	const handleDropFiles = (targetFolderId: string | null, transfer: DataTransfer) => {
		const _ = driveTasks.uploadDropped(account, { transfer, targetFolderId });
	};

	/**
	 * ツールバーで選ばれたファイルを表示中フォルダへアップロードする
	 * @param files - アップロードするファイル
	 */
	const handleUploadFiles = (files: File[]) => {
		driveTasks.uploadFiles(account, { files, targetFolderId: driveStore.currentFolderId });
	};

	/**
	 * フォルダへ移動する(選択と検索、選択モードは解除する)
	 * @param folderId - 移動先のフォルダID(ルートはnull)
	 */
	const handleNavigate = (folderId: string | null) => {
		selectionStore.clear();
		searchStore.clear();
		selectMode = false;
		driveStore.openFolder(folderId);
	};

	/**
	 * 項目の選択操作を選択ストアへ反映する
	 * @param kind - 項目の種別
	 * @param id - 項目のID
	 * @param modifiers - 修飾キーの状態
	 */
	const handleSelectItem = (
		kind: 'file' | 'folder',
		id: string,
		modifiers: { toggle: boolean; range: boolean },
	) => {
		selectionStore.click(makeSelectionKey(kind, id), modifiers, orderedKeys);
	};

	$effect(() => {
		searchStore.setAccount(account.id);
		if (driveStore.accountId !== account.id) {
			selectionStore.clear();
			selectMode = false;
			detailsSheetOpen = false;
			moveOpen = false;
			menuPosition = null;
			driveStore.openAccount(account.id);
		}
	});

	$effect(() => {
		if (
			syncStore.status === 'idle' &&
			syncStore.accountId === account.id &&
			driveStore.accountId === account.id
		) {
			driveStore.refresh();
			searchStore.rerun();
		}
	});

	$effect(() => {
		const progress = syncStore.folderCount + syncStore.fileCount;
		if (
			progress > 0 &&
			syncStore.status === 'syncing' &&
			syncStore.accountId === account.id &&
			driveStore.accountId === account.id
		) {
			// 同期はページ取得ごとにキャッシュへ書き込む
			const _ = driveStore.refreshQuiet();
		}
	});

	$effect(() => {
		if (selectionStore.last !== null) {
			detailsClosed = false;
		}
	});
</script>

<svelte:window
	onkeydown={shortcuts.handleKeydown}
	onpaste={shortcuts.handlePaste}
	ondragstart={drag.beginTrack}
	ondrag={drag.track}
	ondragover={drag.track}
/>

<DriveExplorer
	childrenMap={driveStore.childrenMap}
	currentFolderId={driveStore.currentFolderId}
	breadcrumb={driveStore.breadcrumb}
	folders={visibleFolders}
	files={visibleFiles}
	viewMode={driveStore.viewMode}
	sortKey={driveStore.sortKey}
	sortOrder={driveStore.sortOrder}
	selectedKeys={effectiveKeys}
	{detailTarget}
	detailsOpen={detailsPanelOpen}
	{selectionSize}
	onnavigate={handleNavigate}
	onsort={(key) => {
		driveStore.toggleSort(key);
	}}
	onviewmode={(mode) => {
		driveStore.changeViewMode(mode);
	}}
	onselectitem={handleSelectItem}
	onclearselection={() => {
		selectionStore.clear();
	}}
	onclosedetails={() => {
		detailsClosed = true;
		detailsSheetOpen = false;
	}}
	onpreviewfile={(file) => {
		previewFile = file;
	}}
	oncreatefolder={() => {
		createOpen = true;
	}}
	onrename={() => {
		renameOpen = true;
	}}
	onsavemetadata={handleSaveMetadata}
	ondeleteselection={() => {
		deleteOpen = true;
	}}
	actionBusy={driveActionsStore.busy}
	ondragstartitem={drag.startItem}
	ondragenditem={drag.end}
	ondropitems={drag.drop}
	ondropfiles={handleDropFiles}
	onuploadfiles={handleUploadFiles}
	ondownloadselection={downloadSelection}
	onopenmenu={handleOpenMenu}
	searchQuery={searchResult === null ? null : searchStore.query}
	onclearsearch={() => {
		searchStore.clear();
	}}
	{phone}
	{tablet}
	{selectMode}
	ontoggleselectmode={toggleSelectMode}
	onmoveselection={() => {
		moveOpen = true;
	}}
/>

<SelectionOverlays
	{phone}
	detailsAction={touch}
	{menuPosition}
	targets={deleteTargets}
	title={sheetTitle}
	onclosemenu={() => {
		menuPosition = null;
	}}
	onaction={(action) => {
		if (action === 'download') {
			downloadSelection();
		} else if (action === 'details') {
			detailsSheetOpen = true;
		} else if (action === 'move') {
			moveOpen = true;
		} else {
			shortcuts.run(action);
		}
	}}
	detailsOpen={detailsSheetOpen}
	{detailTarget}
	selectionCount={effectiveKeys.length}
	{selectionSize}
	actionBusy={driveActionsStore.busy}
	onclosedetails={() => {
		detailsSheetOpen = false;
	}}
	onpreview={(file) => {
		detailsSheetOpen = false;
		previewFile = file;
	}}
	onrename={() => {
		renameOpen = true;
	}}
	onsavemetadata={handleSaveMetadata}
	{moveOpen}
	childrenMap={driveStore.childrenMap}
	currentFolderId={driveStore.currentFolderId}
	onclosemove={() => {
		moveOpen = false;
	}}
	onmove={handleMoveSelection}
	oncreatemovefolder={(input) => driveActionsStore.createFolderAt(account, input)}
/>

<DriveActionDialogs
	{account}
	bind:createOpen
	bind:renameOpen
	bind:deleteOpen
	{renameItem}
	{renameInitial}
	{deleteTargets}
/>

<PreviewModal
	file={previewFile}
	onclose={() => {
		previewFile = null;
	}}
	ondownload={(file) => {
		driveTasks.download(account, [{ kind: 'file', id: file.id }]);
	}}
	ondetails={phone ? handlePreviewDetails : undefined}
/>
