<script module lang="ts">
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconFolderSymlink from '@tabler/icons-svelte/icons/folder-symlink';
	import IconInfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconTrash from '@tabler/icons-svelte/icons/trash';

	// 選択項目の操作ごとのアイコン(右クリックメニューとスマートフォンのシートで共用)
	export const ICONS = {
		details: IconInfoCircle,
		download: IconDownload,
		move: IconFolderSymlink,
		rename: IconPencil,
		delete: IconTrash,
	} as const;
</script>

<script lang="ts">
	import type { MenuAction, MenuItem } from '../../lib/services/context-menu';
	import ContextMenu from '$components/molecules/ContextMenu.svelte';

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** 表示位置のx座標(ビューポート基準) */
		x: number;
		/** 表示位置のy座標(ビューポート基準) */
		y: number;
		/** 表示する項目 */
		items: MenuItem[];
		/** 項目が選ばれた時の処理 */
		onselect: (id: MenuAction) => void;
		/** メニューを閉じる操作 */
		onclose: () => void;
	};

	let { open, x, y, items, onselect, onclose }: Props = $props();

	const decorated = $derived(
		items.map((item) => ({
			id: item.id,
			label: item.label,
			danger: item.danger,
			disabled: item.disabled,
			icon: ICONS[item.id],
		})),
	);
</script>

<!-- 選択項目用の右クリックメニュー(汎用のContextMenuへ操作ごとのアイコンを付けて渡す) -->
<ContextMenu {open} {x} {y} items={decorated} {onselect} {onclose} />
