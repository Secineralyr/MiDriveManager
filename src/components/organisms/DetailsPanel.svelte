<script module lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';

	/** 詳細パネルの表示対象 */
	export type DetailTarget =
		| {
				/** 対象の種別 */
				kind: 'file';
				/** 対象のファイル */
				file: FileRecord;
		  }
		| {
				/** 対象の種別 */
				kind: 'folder';
				/** 対象のフォルダ */
				folder: FolderRecord;
		  };

</script>

<script lang="ts">
	import DetailsContent from '$components/organisms/DetailsContent.svelte';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconX from '@tabler/icons-svelte/icons/x';
	import { slidePanel } from '../../lib/utils/transitions';

	type Props = {
		/** 表示対象(選択なしならnull) */
		target: DetailTarget | null;
		/** 選択中の件数 */
		selectionCount: number;
		/** 選択中ファイルの合計サイズ */
		selectionSize: number;
		/** 操作の実行中かどうか */
		actionBusy?: boolean;
		/** パネルを閉じる操作 */
		onclose: () => void;
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
	};

	let {
		target,
		selectionCount,
		selectionSize,
		actionBusy = false,
		onclose,
		onpreview,
		onrename,
		onsavemetadata,
	}: Props = $props();

	/** パネル幅の下限(px) */
	const MIN_WIDTH = 240;

	/** パネル幅の上限(px) */
	const MAX_WIDTH = 480;

	/** キー操作1回で変える幅(px) */
	const RESIZE_STEP = 10;

	let panelWidth = $state(280);
	let resizing = $state(false);

	/**
	 * 幅を上下限に収める
	 * @param width - 幅(px)
	 * @returns 収めた幅
	 */
	const clampWidth = (width: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));

	/**
	 * 境界線のドラッグを開始する
	 * @param event - ポインターイベント
	 */
	const handleResizeStart = (event: PointerEvent) => {
		resizing = true;
		if (event.currentTarget instanceof Element) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
	};

	/**
	 * ドラッグ中の位置から幅を更新する(パネルは画面右端に接している)
	 * @param event - ポインターイベント
	 */
	const handleResizeMove = (event: PointerEvent) => {
		if (resizing) {
			panelWidth = clampWidth(innerWidth - event.clientX);
		}
	};

	/** 境界線のドラッグを終える */
	const handleResizeEnd = () => {
		resizing = false;
	};

	/**
	 * 矢印キーで幅を変える
	 * @param event - キーボードイベント
	 */
	const handleResizeKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
			return;
		}

		event.preventDefault();
		const delta = event.key === 'ArrowLeft' ? RESIZE_STEP : -RESIZE_STEP;
		panelWidth = clampWidth(panelWidth + delta);
	};
</script>

<section
	aria-label="詳細"
	data-tour="details"
	style:min-width="{panelWidth}px"
	style:max-width="{panelWidth}px"
	transition:slidePanel|global
>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -- separatorロールの境界線をポインタと矢印キーで操作するため -->
	<div
		class="resizer"
		role="separator"
		aria-orientation="vertical"
		aria-label="詳細パネルの幅を変更"
		aria-valuenow={panelWidth}
		tabindex="0"
		onpointerdown={handleResizeStart}
		onpointermove={handleResizeMove}
		onpointerup={handleResizeEnd}
		onpointercancel={handleResizeEnd}
		onkeydown={handleResizeKeydown}
	></div>
	<header>
		<h2>詳細</h2>
		<IconButton label="詳細を閉じる" onclick={onclose}>
			<IconX size={18} />
		</IconButton>
	</header>
	<DetailsContent
		{target}
		{selectionCount}
		{selectionSize}
		{actionBusy}
		{onpreview}
		{onrename}
		{onsavemetadata}
	/>
</section>

<style>
	section {
		display: flex;
		position: relative;
		flex-direction: column;
		border-left: 1px solid var(--color-outline-weak);
		padding: 15px;
		gap: 10px;
		overflow-y: auto;
	}

	/* 左端の境界線。ドラッグで幅を調整する */
	.resizer {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		z-index: 1;
		inline-size: 6px;
		cursor: col-resize;
		touch-action: none;
	}

	.resizer:hover,
	.resizer:focus-visible {
		outline: none;
		background-color: var(--color-outline);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	/* 中くらいの幅以下では、一覧を狭めずに右から重ねて表示する */
	@media (max-width: 1024px) {
		section {
			position: absolute;
			top: 0;
			right: 0;
			bottom: 0;
			z-index: 10;
			background-color: var(--color-bg);
		}
	}
</style>
