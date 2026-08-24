<script lang="ts">
	import BottomSheet from '$components/molecules/BottomSheet.svelte';
	import Button from '$components/atoms/Button.svelte';
	import type { DriveItem } from '../../lib/services/drive-actions';
	import type { FolderRecord } from '../../lib/db/schema';
	import FolderTree from '$components/organisms/FolderTree.svelte';
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
	};

	let {
		open,
		childrenMap,
		currentFolderId,
		items,
		onclose,
		onmove,
		variant = 'sheet',
	}: Props = $props();

	let target = $state<string | null>(null);

	$effect(() => {
		// 開くたびに表示中のフォルダを起点にして選び直す
		if (open) {
			target = currentFolderId;
		}
	});

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
		<Button
			disabled={!allowed}
			onclick={() => {
				onmove(target);
			}}
		>
			ここへ移動
		</Button>
	</div>
</BottomSheet>

<style>
	/* 確定ボタンを全幅で伸ばす */
	div {
		display: flex;
		flex-direction: column;
	}
</style>
