<script lang="ts">
	import type { AccountRecord, FileRecord, FolderRecord } from '../../lib/db/schema';
	import {
		makeSelectionKey,
		parseSelectionKey,
		selectionStore,
	} from '../../lib/stores/selection.svelte';
	import DriveActionDialogs from '$components/organisms/DriveActionDialogs.svelte';
	import DriveExplorer from '$components/organisms/DriveExplorer.svelte';
	import PreviewModal from '$components/organisms/PreviewModal.svelte';
	import type { ShortcutAction } from '../../lib/utils/shortcuts';
	import { clipboardStore } from '../../lib/stores/clipboard.svelte';
	import { driveActionsStore } from '../../lib/stores/drive-actions.svelte';
	import { driveStore } from '../../lib/stores/drive.svelte';
	import { driveTasks } from '../../lib/stores/drive-tasks';
	import { resolveShortcut } from '../../lib/utils/shortcuts';
	import { syncStore } from '../../lib/stores/sync.svelte';

	/** 詳細パネルの表示対象(DetailsPanelのDetailTargetと同じ形) */
	type DetailTarget =
		| {
				/** 対象の種別 */
				kind: 'file';
				/** 対象のファイル */
				file: FileRecord;
		  }
		| {
				/** 対象の種別 */
				kind: 'folder';
				/** 対象のフォルダ */
				folder: FolderRecord;
		  };

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

	const orderedKeys = $derived([
		...driveStore.childFolders.map((folder) => makeSelectionKey('folder', folder.id)),
		...driveStore.files.map((file) => makeSelectionKey('file', file.id)),
	]);

	const effectiveKeys = $derived(selectionStore.keys.filter((key) => orderedKeys.includes(key)));

	const detailTarget = $derived.by((): DetailTarget | null => {
		const lastKey = effectiveKeys.at(-1);
		if (lastKey === undefined) {
			return null;
		}
		const folder = driveStore.childFolders.find(
			(candidate) => makeSelectionKey('folder', candidate.id) === lastKey,
		);
		if (folder !== undefined) {
			return { kind: 'folder', folder };
		}
		const file = driveStore.files.find(
			(candidate) => makeSelectionKey('file', candidate.id) === lastKey,
		);
		return file === undefined ? null : { kind: 'file', file };
	});

	const selectionSize = $derived(
		driveStore.files
			.filter((file) => effectiveKeys.includes(makeSelectionKey('file', file.id)))
			.reduce((sum, file) => sum + file.size, 0),
	);

	const renameInitial = $derived.by(() => {
		if (detailTarget === null) {
			return '';
		}
		return detailTarget.kind === 'file' ? detailTarget.file.name : detailTarget.folder.name;
	});

	const renameItem = $derived.by((): { kind: 'file' | 'folder'; id: string } | null => {
		if (detailTarget === null) {
			return null;
		}
		return detailTarget.kind === 'file'
			? { kind: 'file', id: detailTarget.file.id }
			: { kind: 'folder', id: detailTarget.folder.id };
	});

	const deleteTargets = $derived(effectiveKeys.map((key) => parseSelectionKey(key)));

	/**
	 * ファイルのメタデータ保存を実行する
	 * @param metadata - 更新するメタデータ
	 */
	const handleSaveMetadata = async (metadata: {
		/** コメント(代替テキスト)。空欄はnull */
		comment: string | null;
		/** センシティブフラグ */
		isSensitive: boolean;
	}) => {
		if (detailTarget?.kind !== 'file') {
			return;
		}

		const ok = await driveActionsStore.saveFileMetadata(account, {
			fileId: detailTarget.file.id,
			metadata,
		});
		if (ok) {
			await driveStore.refresh();
		}
	};

	/**
	 * 項目のドラッグ開始(未選択の項目はその項目だけを選択してから開始する)
	 * @param kind - 項目の種別
	 * @param id - 項目のID
	 */
	const handleDragStartItem = (kind: 'file' | 'folder', id: string) => {
		const key = makeSelectionKey(kind, id);
		if (!selectionStore.isSelected(key)) {
			selectionStore.click(key, { toggle: false, range: false }, orderedKeys);
		}

		draggedKeys = [...selectionStore.keys];
	};

	/** ドラッグ状態を解除する */
	const handleDragEndItem = () => {
		draggedKeys = [];
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
	 * 選択中の項目をクリップボードへ入れる
	 * @param mode - copy(コピー)またはcut(切り取り)
	 */
	const copySelection = (mode: 'copy' | 'cut') => {
		const items = effectiveKeys.map((key) => parseSelectionKey(key));
		if (items.length === 0) {
			return;
		}

		if (mode === 'copy') {
			clipboardStore.setCopy(account.id, items);
		} else {
			clipboardStore.setCut(account.id, items);
		}
	};

	/** クリップボードの内容の貼り付け(移動または複製)を操作キューへ積む */
	const pasteClipboard = async () => {
		const result = await clipboardStore.pasteInto(account, driveStore.currentFolderId);
		if (result === 'moved') {
			selectionStore.clear();
		}
	};

	/**
	 * 入力中やダイアログ表示中はショートカットを無効にする
	 * @param event - キーボードイベント
	 * @returns 無効にするならtrue
	 */
	const shouldIgnoreShortcut = (event: KeyboardEvent) => {
		if (createOpen || renameOpen || deleteOpen || previewFile !== null) {
			return true;
		}

		const { target } = event;
		return (
			target instanceof HTMLElement &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
		);
	};

	/**
	 * ショートカット操作を実行する
	 * @param action - 実行する操作
	 */
	const runShortcut = (action: ShortcutAction) => {
		const handlers: Record<ShortcutAction, () => void> = {
			selectAll: () => {
				selectionStore.selectAll(orderedKeys);
			},
			copy: () => {
				copySelection('copy');
			},
			cut: () => {
				copySelection('cut');
			},
			paste: () => {
				pasteClipboard();
			},
			delete: () => {
				if (effectiveKeys.length > 0) {
					deleteOpen = true;
				}
			},
			rename: () => {
				if (effectiveKeys.length === 1) {
					renameOpen = true;
				}
			},
			clearSelection: () => {
				selectionStore.clear();
			},
		};
		
		handlers[action]();
	};

	/**
	 * キー入力からショートカットを実行する
	 * @param event - キーボードイベント
	 */
	const handleKeydown = (event: KeyboardEvent) => {
		if (shouldIgnoreShortcut(event)) {
			return;
		}

		const action = resolveShortcut({ key: event.key, ctrl: event.ctrlKey || event.metaKey });
		if (action === null) {
			return;
		}

		event.preventDefault();
		runShortcut(action);
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

<svelte:window onkeydown={handleKeydown} />

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
	ondragenditem={handleDragEndItem}
	ondropitems={handleDropItems}
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
/>
