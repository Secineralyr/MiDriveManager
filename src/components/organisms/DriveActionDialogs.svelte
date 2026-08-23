<script lang="ts">
	import ConfirmDialog from '$components/molecules/ConfirmDialog.svelte';
	import PromptDialog from '$components/molecules/PromptDialog.svelte';

	type Props = {
		/** フォルダ作成ダイアログを表示するかどうか */
		createOpen: boolean;
		/** リネームダイアログを表示するかどうか */
		renameOpen: boolean;
		/** リネームの初期値(現在の名前) */
		renameInitial: string;
		/** 削除確認ダイアログを表示するかどうか */
		deleteOpen: boolean;
		/** 削除対象の件数 */
		deleteCount: number;
		/** 操作の実行中かどうか */
		busy: boolean;
		/** フォルダ作成確定時の処理 */
		oncreate: (name: string) => void;
		/** リネーム確定時の処理 */
		onrename: (name: string) => void;
		/** 削除確定時の処理 */
		ondelete: () => void;
		/** いずれかのダイアログを閉じる操作 */
		oncanceldialog: () => void;
	};

	let {
		createOpen,
		renameOpen,
		renameInitial,
		deleteOpen,
		deleteCount,
		busy,
		oncreate,
		onrename,
		ondelete,
		oncanceldialog,
	}: Props = $props();
</script>

<PromptDialog
	open={createOpen}
	title="新しいフォルダ"
	label="フォルダ名"
	confirmLabel="作成"
	{busy}
	onconfirm={oncreate}
	oncancel={oncanceldialog}
/>

<PromptDialog
	open={renameOpen}
	title="名前の変更"
	label="新しい名前"
	initialValue={renameInitial}
	confirmLabel="変更"
	{busy}
	onconfirm={onrename}
	oncancel={oncanceldialog}
/>

<ConfirmDialog
	open={deleteOpen}
	title="削除の確認"
	message="{deleteCount}件の項目を削除します。この操作は取り消せません。サーバー上からも削除されます。"
	confirmLabel="削除"
	danger
	onconfirm={ondelete}
	oncancel={oncanceldialog}
/>
