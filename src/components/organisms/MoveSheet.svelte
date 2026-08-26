<script lang="ts">
	import BottomSheet from '$components/molecules/BottomSheet.svelte';
	import Button from '$components/atoms/Button.svelte';
	import type { DriveItem } from '../../lib/services/drive-actions';
	import type { FolderRecord } from '../../lib/db/schema';
	import FolderTree from '$components/organisms/FolderTree.svelte';
	import PromptDialog from '$components/molecules/PromptDialog.svelte';
	import { isMoveTargetAllowed } from '../../lib/services/move-target';

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** 親キーごとの子フォルダ一覧(ツリー用) */
		childrenMap: Record<string, FolderRecord[]>;
		/** 表示中のフォルダID(ルートはnull)。開いた時の初期位置にする */
		currentFolderId: string | null;
		/** 移動する項目 */
		items: DriveItem[];
		/** シートを閉じる操作 */
		onclose: () => void;
		/** 移動先を確定した時の処理 */
		onmove: (targetFolderId: string | null) => void;
		/** 表示の形(sheetは画面下から、dialogは画面中央) */
		variant?: 'sheet' | 'dialog';
		/**
		 * 選択中のフォルダ直下へフォルダを作成する処理(指定した場合だけ作成ボタンを表示する)
		 * 作成したフォルダIDを返し、失敗した場合はnull(エラー表示は呼び出し側が行う)
		 */
		oncreatefolder?: (input: {
			/** フォルダ名 */
			name: string;
			/** 親フォルダID(ルート直下はnull) */
			parentId: string | null;
		}) => Promise<string | null>;
	};

	let {
		open,
		childrenMap,
		currentFolderId,
		items,
		onclose,
		onmove,
		variant = 'sheet',
		oncreatefolder,
	}: Props = $props();

	let target = $state<string | null>(null);
	let createOpen = $state(false);
	let creating = $state(false);

	$effect(() => {
		// 開くたびに表示中のフォルダを起点にして選び直す
		if (open) {
			target = currentFolderId;
			createOpen = false;
			creating = false;
		}
	});

	/**
	 * 選択中のフォルダ(未選択ならルート)の直下へフォルダを作成し、作成できたら移動先として選ぶ
	 * 失敗した場合は名前入力を開いたままにする(エラーはトーストで表示される)
	 * @param name - フォルダ名
	 */
	const handleCreate = async (name: string) => {
		if (oncreatefolder === undefined) {
			return;
		}

		creating = true;
		const createdId = await oncreatefolder({ name, parentId: target });
		creating = false;
		if (createdId !== null) {
			target = createdId;
			createOpen = false;
		}
	};

	const allowed = $derived(
		isMoveTargetAllowed({ childrenMap, items, currentFolderId, targetFolderId: target }),
	);
</script>

<BottomSheet {open} title="移動先を選択" {onclose} {variant}>
	<!-- シートは画面幅いっぱいなので、インデントを止める深さはドロワーより深い10階層にする -->
	<FolderTree
		{childrenMap}
		currentFolderId={target}
		expandOnSelect
		maxIndentDepth={10}
		onnavigate={(folderId) => {
			target = folderId;
		}}
	/>
	<div>
		{#if oncreatefolder !== undefined}
			<span>
				<Button
					variant="tonal"
					disabled={creating}
					onclick={() => {
						createOpen = true;
					}}
				>
					新しいフォルダ
				</Button>
			</span>
		{/if}
		<span>
			<Button
				disabled={!allowed}
				onclick={() => {
					onmove(target);
				}}
			>
				ここへ移動
			</Button>
		</span>
	</div>
</BottomSheet>

<PromptDialog
	open={createOpen}
	title="新しいフォルダ"
	label="フォルダ名"
	confirmLabel="作成"
	busy={creating}
	onconfirm={handleCreate}
	oncancel={() => {
		createOpen = false;
	}}
/>

<style>
	div {
		display: flex;
		gap: 10px;
	}

	div > span {
		display: flex;
		flex: 1;
		flex-direction: column;
	}
</style>
