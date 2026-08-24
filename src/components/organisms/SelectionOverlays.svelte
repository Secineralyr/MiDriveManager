<script lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import type { MenuAction, MenuItem } from '../../lib/services/context-menu';
	import SelectionMenu, { ICONS } from '$components/molecules/SelectionMenu.svelte';
	import ActionSheet from '$components/molecules/ActionSheet.svelte';
	import BottomSheet from '$components/molecules/BottomSheet.svelte';
	import type { DetailTarget } from '../../lib/services/detail-target';
	import DetailsContent from '$components/organisms/DetailsContent.svelte';
	import type { DriveItem } from '../../lib/services/drive-actions';
	import MoveSheet from '$components/organisms/MoveSheet.svelte';
	import { buildSelectionMenu } from '../../lib/services/context-menu';

	type Props = {
		/** スマートフォン表示かどうか(メニューの代わりにシートを出す) */
		phone: boolean;
		/** メニューに「詳細」を含めるかどうか(詳細を自動で出さないタッチ操作で使う) */
		detailsAction?: boolean;
		/** メニューの表示位置(閉じている時はnull。スマートフォンでは位置は使わずシートを開く) */
		menuPosition: { x: number; y: number } | null;
		/** 操作対象の項目(選択中の項目) */
		targets: DriveItem[];
		/** シートの見出し(対象の名前や件数) */
		title: string;
		/** メニュー(シート)を閉じる操作 */
		onclosemenu: () => void;
		/** 操作が選ばれた時の処理 */
		onaction: (action: MenuAction) => void;
		/** 詳細シートを表示するかどうか(スマートフォン用) */
		detailsOpen: boolean;
		/** 詳細の表示対象 */
		detailTarget: DetailTarget | null;
		/** 選択中の件数 */
		selectionCount: number;
		/** 選択中ファイルの合計サイズ */
		selectionSize: number;
		/** 操作の実行中かどうか */
		actionBusy: boolean;
		/** 詳細シートを閉じる操作 */
		onclosedetails: () => void;
		/** ファイルのプレビューを開く操作 */
		onpreview: (file: FileRecord) => void;
		/** 名前の変更を開始する操作 */
		onrename: () => void;
		/** メタデータ保存時の処理 */
		onsavemetadata: (metadata: {
			/** 説明(代替テキスト)。空欄はnull */
			comment: string | null;
			/** センシティブフラグ */
			isSensitive: boolean;
		}) => void;
		/** 移動先の選択シートを表示するかどうか(スマートフォン用) */
		moveOpen: boolean;
		/** 親キーごとの子フォルダ一覧(移動先のツリー用) */
		childrenMap: Record<string, FolderRecord[]>;
		/** 表示中のフォルダID(ルートはnull) */
		currentFolderId: string | null;
		/** 移動先の選択シートを閉じる操作 */
		onclosemove: () => void;
		/** 移動先を確定した時の処理 */
		onmove: (targetFolderId: string | null) => void;
	};

	let {
		phone,
		detailsAction = false,
		menuPosition,
		targets,
		title,
		onclosemenu,
		onaction,
		detailsOpen,
		detailTarget,
		selectionCount,
		selectionSize,
		actionBusy,
		onclosedetails,
		onpreview,
		onrename,
		onsavemetadata,
		moveOpen,
		childrenMap,
		currentFolderId,
		onclosemove,
		onmove,
	}: Props = $props();

	const menuItems = $derived(buildSelectionMenu(targets, { details: detailsAction }));

	/**
	 * シート用にアイコンを付けた項目を作る
	 * @param items - メニューの項目
	 * @returns アイコン付きの項目
	 */
	const decorate = (items: MenuItem[]) =>
		items.map((item) => ({
			id: item.id,
			label: item.label,
			danger: item.danger,
			disabled: item.disabled,
			icon: ICONS[item.id],
		}));
</script>

{#if phone}
	<ActionSheet
		open={menuPosition !== null}
		{title}
		items={decorate(menuItems)}
		onselect={onaction}
		onclose={onclosemenu}
	/>
	<BottomSheet open={detailsOpen} title="詳細" onclose={onclosedetails}>
		<DetailsContent
			target={detailTarget}
			{selectionCount}
			{selectionSize}
			{actionBusy}
			{onpreview}
			{onrename}
			{onsavemetadata}
		/>
	</BottomSheet>
{:else}
	<SelectionMenu
		open={menuPosition !== null}
		x={menuPosition?.x ?? 0}
		y={menuPosition?.y ?? 0}
		items={menuItems}
		onselect={onaction}
		onclose={onclosemenu}
	/>
{/if}

<!-- 移動先の選択(スマートフォンは下からのシート、それ以外は中央のダイアログ) -->
<MoveSheet
	open={moveOpen}
	{childrenMap}
	{currentFolderId}
	items={targets}
	onclose={onclosemove}
	{onmove}
	variant={phone ? 'sheet' : 'dialog'}
/>
