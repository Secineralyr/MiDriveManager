<script lang="ts">
	import type { FolderRecord } from '../../lib/db/schema';
	import FolderTree from '$components/organisms/FolderTree.svelte';
	import { createPanelResizer } from '../../lib/utils/panel-resize.svelte';

	type Props = {
		/** 親キーごとの子フォルダ一覧 */
		childrenMap: Record<string, FolderRecord[]>;
		/** 表示中のフォルダID(ルートはnull) */
		currentFolderId: string | null;
		/** 狭い画面のドロワーとして開いているかどうか */
		open?: boolean;
		/** フォルダ選択時の処理 */
		onnavigate: (folderId: string | null) => void;
		/** フォルダへの項目ドロップ時の処理 */
		ondropitems?: (folderId: string | null) => void;
		/** フォルダへのOSファイルドロップ時の処理 */
		ondropfiles?: (folderId: string | null, transfer: DataTransfer) => void;
	};

	let {
		childrenMap,
		currentFolderId,
		open = false,
		onnavigate,
		ondropitems,
		ondropfiles,
	}: Props = $props();

	const resizer = createPanelResizer({
		initial: 240,
		min: 180,
		max: 480,
		step: 10,
		anchor: 'left',
	});

	let aside = $state<HTMLElement | null>(null);

	/**
	 * 境界線のドラッグ中に、ツリーの左端からの距離で幅を更新する
	 * @param event - ポインターイベント
	 */
	const handleResizeMove = (event: PointerEvent) => {
		resizer.move(event, aside?.getBoundingClientRect().left ?? 0);
	};
</script>

<aside
	bind:this={aside}
	data-tour="tree"
	data-open={open}
	style:min-width="{resizer.width}px"
	style:max-width="{resizer.width}px"
>
	<FolderTree {childrenMap} {currentFolderId} {onnavigate} {ondropitems} {ondropfiles} />
</aside>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -- separatorロールの境界線をポインタと矢印キーで操作するため -->
<div
	class="resizer"
	role="separator"
	aria-orientation="vertical"
	aria-label="フォルダツリーの幅を変更"
	aria-valuenow={resizer.width}
	tabindex="0"
	onpointerdown={resizer.start}
	onpointermove={handleResizeMove}
	onpointerup={resizer.end}
	onpointercancel={resizer.end}
	onkeydown={resizer.keydown}
></div>

<style>
	aside {
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--color-outline-weak);
		overflow-y: auto;
	}

	/* ツリーの右端に重ねる境界線。ドラッグで幅を調整する(デスクトップのみ) */
	.resizer {
		position: relative;
		z-index: 1;
		margin-left: -6px;
		inline-size: 6px;
		cursor: col-resize;
		touch-action: none;
	}

	.resizer:hover,
	.resizer:focus-visible {
		outline: none;
		background-color: var(--color-outline);
	}

	/* タッチ端末と狭い画面: 幅の変更は使わない(インデントを浅くする側で対応する) */
	@media (pointer: coarse), (max-width: 640px) {
		.resizer {
			display: none;
		}
	}

	/* 狭い画面: ドロワー化して外側(DriveExplorer)の開閉ボタンとスクリムで出し入れする */
	@media (max-width: 640px) {
		aside {
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			z-index: 20;
			border-right: 1px solid var(--color-outline);
			padding-bottom: env(safe-area-inset-bottom);
			background-color: var(--color-bg);
			transform: translateX(-100%);
			transition: transform 250ms ease;
		}

		aside[data-open='true'] {
			transform: translateX(0);
		}
	}
</style>
