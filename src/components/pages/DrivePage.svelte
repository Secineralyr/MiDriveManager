<script lang="ts">
	import type { AccountRecord, FileRecord } from '../../lib/db/schema';
	import {
		makeSelectionKey,
		parseSelectionKey,
		selectionStore,
	} from '../../lib/stores/selection.svelte';
	import type { DetailTarget } from '$components/organisms/DetailsPanel.svelte';
	import DriveActionDialogs from '$components/organisms/DriveActionDialogs.svelte';
	import DriveExplorer from '$components/organisms/DriveExplorer.svelte';
	import PreviewModal from '$components/organisms/PreviewModal.svelte';
	import { driveActionsStore } from '../../lib/stores/drive-actions.svelte';
	import { driveStore } from '../../lib/stores/drive.svelte';
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

	/** すべての操作ダイアログを閉じる */
	const closeDialogs = () => {
		createOpen = false;
		renameOpen = false;
		deleteOpen = false;
	};

	/**
	 * フォルダ作成を確定する
	 * @param name - フォルダ名
	 */
	const handleCreateFolder = async (name: string) => {
		const ok = await driveActionsStore.createFolder(account, {
			name,
			parentId: driveStore.currentFolderId,
		});

		createOpen = false;

		if (ok) {
			await driveStore.refresh();
		}
	};

	/**
	 * 名前の変更を確定する
	 * @param name - 新しい名前
	 */
	const handleRename = async (name: string) => {
		if (detailTarget === null) {
			renameOpen = false;
			return;
		}

		const item: { kind: 'file' | 'folder'; id: string } =
			detailTarget.kind === 'file'
				? { kind: 'file', id: detailTarget.file.id }
				: { kind: 'folder', id: detailTarget.folder.id };
		const ok = await driveActionsStore.rename(account, { item, name });
		renameOpen = false;
		if (ok) {
			await driveStore.refresh();
		}
	};

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

	/** 選択した項目の削除を実行する */
	const handleDeleteSelection = async () => {
		const items = effectiveKeys.map((key) => parseSelectionKey(key));
		const ok = await driveActionsStore.deleteItems(account, items);
		deleteOpen = false;
		if (ok) {
			selectionStore.clear();
		}
		await driveStore.refresh();
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

<DriveExplorer
	childrenMap={driveStore.childrenMap}
	currentFolderId={driveStore.currentFolderId}
	breadcrumb={driveStore.breadcrumb}
	folders={driveStore.childFolders}
	files={driveStore.files}
	viewMode={driveStore.viewMode}
	sortKey={driveStore.sortKey}
	sortOrder={driveStore.sortOrder}
	error={driveStore.error ?? driveActionsStore.error}
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
/>

<DriveActionDialogs
	{createOpen}
	{renameOpen}
	{renameInitial}
	{deleteOpen}
	deleteCount={effectiveKeys.length}
	busy={driveActionsStore.busy}
	oncreate={handleCreateFolder}
	onrename={handleRename}
	ondelete={handleDeleteSelection}
	oncanceldialog={closeDialogs}
/>

<PreviewModal
	file={previewFile}
	onclose={() => {
		previewFile = null;
	}}
/>
