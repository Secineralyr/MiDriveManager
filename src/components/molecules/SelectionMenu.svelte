<script lang="ts">
	import type { MenuAction, MenuItem } from '../../lib/services/context-menu';
	import ContextMenu from '$components/molecules/ContextMenu.svelte';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCut from '@tabler/icons-svelte/icons/cut';
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconTrash from '@tabler/icons-svelte/icons/trash';

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

	/** 操作ごとのアイコン */
	const ICONS = {
		download: IconDownload,
		copy: IconCopy,
		cut: IconCut,
		rename: IconPencil,
		delete: IconTrash,
	} as const;

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
