<script lang="ts">
	import type { AccountRecord, FileRecord } from '../../lib/db/schema';
	import { makeSelectionKey, selectionStore } from '../../lib/stores/selection.svelte';
	import type { DetailTarget } from '$components/organisms/DetailsPanel.svelte';
	import DriveExplorer from '$components/organisms/DriveExplorer.svelte';
	import PreviewModal from '$components/organisms/PreviewModal.svelte';
	import { driveStore } from '../../lib/stores/drive.svelte';
	import { syncStore } from '../../lib/stores/sync.svelte';

	type Props = {
		/** 表示するアカウント */
		account: AccountRecord;
	};

	let { account }: Props = $props();

	let previewFile = $state<FileRecord | null>(null);
	let detailsClosed = $state(false);

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
	error={driveStore.error}
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
/>

<PreviewModal
	file={previewFile}
	onclose={() => {
		previewFile = null;
	}}
/>
