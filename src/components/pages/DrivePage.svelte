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
	import ContextMenu from '$components/molecules/ContextMenu.svelte';
	import DriveActionDialogs from '$components/organisms/DriveActionDialogs.svelte';
	import DriveExplorer from '$components/organisms/DriveExplorer.svelte';
	import type { MenuAction } from '../../lib/services/context-menu';
	import PreviewModal from '$components/organisms/PreviewModal.svelte';
	import { buildSelectionMenu } from '../../lib/services/context-menu';
	import { createDriveShortcuts } from '../../lib/stores/drive-shortcuts';
	import { driveActionsStore } from '../../lib/stores/drive-actions.svelte';
	import { driveStore } from '../../lib/stores/drive.svelte';
	import { driveTasks } from '../../lib/stores/drive-tasks';
	import { syncStore } from '../../lib/stores/sync.svelte';

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
	let draggedKeys = $state<string[]>([]);
	let menuPosition = $state<{ x: number; y: number } | null>(null);

	const orderedKeys = $derived([
		...driveStore.childFolders.map((folder) => makeSelectionKey('folder', folder.id)),
		...driveStore.files.map((file) => makeSelectionKey('file', file.id)),
	]);

	const effectiveKeys = $derived(selectionStore.keys.filter((key) => orderedKeys.includes(key)));

	const detailTarget = $derived.by(() => {
		const lastKey = effectiveKeys.at(-1);
		return resolveDetailTarget({
			last: lastKey === undefined ? null : parseSelectionKey(lastKey),
			folders: driveStore.childFolders,
			files: driveStore.files,
		});
	});

	const selectionSize = $derived(
		driveStore.files
			.filter((file) => effectiveKeys.includes(makeSelectionKey('file', file.id)))
			.reduce((sum, file) => sum + file.size, 0),
	);

	const renameInitial = $derived(detailTargetName(detailTarget));
	const renameItem = $derived(detailTargetItem(detailTarget));
	const deleteTargets = $derived(effectiveKeys.map((key) => parseSelectionKey(key)));
	const menuItems = $derived(buildSelectionMenu(deleteTargets));

	const shortcuts = createDriveShortcuts({
		account: () => account,
		orderedKeys: () => orderedKeys,
		effectiveKeys: () => effectiveKeys,
		blocked: () => createOpen || renameOpen || deleteOpen || previewFile !== null,
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
		/** コメント(代替テキスト)。空欄はnull */
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

	/**
	 * 項目のドラッグ開始(未選択の項目はその項目だけを選択してから開始する)
	 * @param kind - 項目の種別
	 * @param id - 項目のID
	 */
	const handleDragStartItem = (kind: 'file' | 'folder', id: string) => {
		selectIfUnselected(kind, id);
		draggedKeys = [...selectionStore.keys];
	};

	/**
	 * 右クリックされた項目を選択してコンテキストメニューを開く
	 * @param kind - 項目の種別
	 * @param id - 項目のID
	 * @param position - 表示位置
	 */
	const handleOpenMenu = (kind: 'file' | 'folder', id: string, position: { x: number; y: number }) => {
		selectIfUnselected(kind, id);
		menuPosition = position;
	};

	/** 選択中の項目のダウンロードを操作キューへ積む */
	const downloadSelection = () => {
		driveTasks.download(account, deleteTargets);
	};

	/**
	 * コンテキストメニューの操作を実行する
	 * @param action - 選ばれた操作
	 */
	const handleMenuSelect = (action: MenuAction) => {
		if (action === 'download') {
			downloadSelection();
		} else {
			shortcuts.run(action);
		}
	};

	/**
	 * ドラッグ中の項目のフォルダへの移動を操作キューへ積む
	 * @param targetFolderId - 移動先のフォルダID(ルートはnull)
	 */
	const handleDropItems = (targetFolderId: string | null) => {
		const items = draggedKeys.map((key) => parseSelectionKey(key));
		draggedKeys = [];
		if (items.length === 0) {
			return;
		}

		driveTasks.moveItems(account, { items, targetFolderId });
		selectionStore.clear();
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
	 * フォルダへ移動する(選択は解除する)
	 * @param folderId - 移動先のフォルダID(ルートはnull)
	 */
	const handleNavigate = (folderId: string | null) => {
		selectionStore.clear();
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
		if (driveStore.accountId !== account.id) {
			selectionStore.clear();
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
		}
	});

	$effect(() => {
		if (selectionStore.last !== null) {
			detailsClosed = false;
		}
	});
</script>

<svelte:window onkeydown={shortcuts.handleKeydown} onpaste={shortcuts.handlePaste} />

<DriveExplorer
	childrenMap={driveStore.childrenMap}
	currentFolderId={driveStore.currentFolderId}
	breadcrumb={driveStore.breadcrumb}
	folders={driveStore.childFolders}
	files={driveStore.files}
	viewMode={driveStore.viewMode}
	sortKey={driveStore.sortKey}
	sortOrder={driveStore.sortOrder}
	selectedKeys={effectiveKeys}
	{detailTarget}
	detailsOpen={effectiveKeys.length > 0 && !detailsClosed}
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
	ondragstartitem={handleDragStartItem}
	ondragenditem={() => {
		draggedKeys = [];
	}}
	ondropitems={handleDropItems}
	ondropfiles={handleDropFiles}
	onuploadfiles={handleUploadFiles}
	ondownloadselection={downloadSelection}
	onopenmenu={handleOpenMenu}
/>

<ContextMenu
	open={menuPosition !== null}
	x={menuPosition?.x ?? 0}
	y={menuPosition?.y ?? 0}
	items={menuItems}
	onselect={handleMenuSelect}
	onclose={() => {
		menuPosition = null;
	}}
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
/>
