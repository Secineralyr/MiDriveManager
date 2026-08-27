<script lang="ts">
	import type { AccountRecord } from '../../lib/db/schema';
	import ConfirmDialog from '$components/molecules/ConfirmDialog.svelte';
	import type { DriveItem } from '../../lib/services/drive-actions';
	import PromptDialog from '$components/molecules/PromptDialog.svelte';
	import { driveActionsStore } from '../../lib/stores/drive-actions.svelte';
	
	import { driveTasks } from '../../lib/stores/drive-tasks';
	import { selectionStore } from '../../lib/stores/selection.svelte';

	type Props = {
		/** 操作対象のアカウント */
		account: AccountRecord;
		/** フォルダ作成ダイアログの表示状態(バインド可能) */
		createOpen: boolean;
		/** フォルダの作成先(ルート直下はnull) */
		createParentId: string | null;
		/** リネームダイアログの表示状態(バインド可能) */
		renameOpen: boolean;
		/** 削除確認ダイアログの表示状態(バインド可能) */
		deleteOpen: boolean;
		/** リネーム対象の項目(未選択ならnull) */
		renameItem: DriveItem | null;
		/** リネームの初期値(現在の名前) */
		renameInitial: string;
		/** 削除対象の項目一覧 */
		deleteTargets: DriveItem[];
		/** 選択解除の確認ダイアログの表示状態(バインド可能。PCで大きな選択を誤って解除しそうな時に開く) */
		clearConfirmOpen?: boolean;
		/** 選択解除の確認に表示する選択件数 */
		clearCount?: number;
		/** 選択解除の確認で解除が確定した時の処理 */
		onclearselection?: () => void;
	};

	let {
		account,
		createOpen = $bindable(),
		createParentId,
		renameOpen = $bindable(),
		deleteOpen = $bindable(),
		renameItem,
		renameInitial,
		deleteTargets,
		clearConfirmOpen = $bindable(false),
		clearCount = 0,
		onclearselection,
	}: Props = $props();

	/** すべての操作ダイアログを閉じる */
	const closeAll = () => {
		createOpen = false;
		renameOpen = false;
		deleteOpen = false;
		clearConfirmOpen = false;
	};

	/**
	 * フォルダ作成を確定する(表示中のフォルダ直下に作るタスクを操作キューへ積む)
	 * @param name - フォルダ名
	 */
	const handleCreate = (name: string) => {
		driveTasks.createFolder(account, {
			name,
			parentId: createParentId,
		});
		createOpen = false;
	};

	/**
	 * 名前の変更を確定する
	 * @param name - 新しい名前
	 */
	const handleRename = async (name: string) => {
		if (renameItem === null) {
			renameOpen = false;
			return;
		}
		await driveActionsStore.rename(account, { item: renameItem, name });
		renameOpen = false;
	};

	/** 選択解除の確認を確定する */
	const handleClearSelection = () => {
		clearConfirmOpen = false;
		onclearselection?.();
	};

	/** 削除を確定する(操作キューへ積み、選択は解除する) */
	const handleDelete = () => {
		driveTasks.deleteItems(account, deleteTargets);
		deleteOpen = false;
		selectionStore.clear();
	};
</script>

<PromptDialog
	open={createOpen}
	title="新しいフォルダ"
	label="フォルダ名"
	confirmLabel="作成"
	onconfirm={handleCreate}
	oncancel={closeAll}
/>

<PromptDialog
	open={renameOpen}
	title="名前の変更"
	label="新しい名前"
	initialValue={renameInitial}
	confirmLabel="変更"
	busy={driveActionsStore.busy}
	onconfirm={handleRename}
	oncancel={closeAll}
/>

<ConfirmDialog
	open={deleteOpen}
	title="削除の確認"
	message="{deleteTargets.length}件の項目を削除します。この操作は取り消せません。サーバー上からも削除され、このファイルを添付したノートも同時に削除されます。"
	confirmLabel="削除"
	danger
	onconfirm={handleDelete}
	oncancel={closeAll}
/>

<ConfirmDialog
	open={clearConfirmOpen}
	title="選択の解除"
	message="{clearCount}件の項目が選択されています。選択を解除しますか?"
	confirmLabel="解除"
	onconfirm={handleClearSelection}
	oncancel={closeAll}
/>
