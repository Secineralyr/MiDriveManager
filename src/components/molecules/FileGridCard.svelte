<script lang="ts">
	import { acceptDragOver, dispatchDrop } from '../../lib/utils/drop-target';
	import CheckboxControl from '$components/atoms/CheckboxControl.svelte';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import type { SelectModifiers } from '../../lib/stores/selection.svelte';
	import { fade } from 'svelte/transition';
	import { longPress } from '../../lib/utils/long-press';

	type Props = {
		/** フォルダカードかどうか */
		folder?: boolean;
		/** 表示名 */
		name: string;
		/** MIMEタイプ(フォルダはnull) */
		mimeType?: string | null;
		/** サムネイル画像URL(ないものはアイコン表示) */
		thumbnailUrl?: string | null;
		/** 選択中かどうか */
		selected?: boolean;
		/** タッチ操作かどうか(スマートフォン・タブレット。タップで開き、長押しでメニューを出す) */
		touch?: boolean;
		/** 選択モード中かどうか(タッチ操作用。タップで選択を切り替える) */
		selectMode?: boolean;
		/** ドラッグでの移動を受け付けるかどうか(スマートフォンでは無効にする) */
		dragEnabled?: boolean;
		/** クリックで選択された時の処理 */
		onselect?: (modifiers: SelectModifiers) => void;
		/** ダブルクリックで開く操作 */
		onopen?: () => void;
		/** ドラッグ開始時の処理 */
		ondragstartitem?: () => void;
		/** ドラッグ終了時の処理 */
		ondragenditem?: () => void;
		/** このカード(フォルダ)への項目ドロップ時の処理 */
		ondropitems?: () => void;
		/** このカード(フォルダ)へのOSファイルドロップ時の処理 */
		ondropfiles?: (transfer: DataTransfer) => void;
		/** 右クリックでコンテキストメニューを開く操作(表示位置を渡す) */
		onopenmenu?: (position: { x: number; y: number }) => void;
	};

	let {
		folder = false,
		name,
		mimeType = null,
		thumbnailUrl = null,
		selected = false,
		touch = false,
		selectMode = false,
		dragEnabled = true,
		onselect,
		onopen,
		ondragstartitem,
		ondragenditem,
		ondropitems,
		ondropfiles,
		onopenmenu,
	}: Props = $props();

	let dropover = $state(false);

	// 選択中の見た目を出すかどうか(タッチ操作の通常時は選択状態を見せない)
	const showSelected = $derived(selected && (!touch || selectMode));

	/**
	 * クリックを通知する
	 * タッチ操作では通常時は開く操作、選択モード中は選択の切り替えにする
	 * @param event - マウスイベント
	 */
	const handleClick = (event: MouseEvent) => {
		event.stopPropagation();
		if (!touch) {
			onselect?.({ toggle: event.ctrlKey || event.metaKey, range: event.shiftKey });
			return;
		}

		if (selectMode) {
			onselect?.({ toggle: true, range: false });
		} else {
			onopen?.();
		}
	};

	/**
	 * 長押しでメニューを開く(タッチ操作用)
	 * @param position - 押し始めの座標
	 */
	const handleLongPress = (position: { x: number; y: number }) => {
		onopenmenu?.(position);
	};

	/** ダブルクリックを外部ハンドラへ伝える */
	const handleDblClick = () => {
		onopen?.();
	};

	/** チェックボックスで選択を切り替える(他の選択は保ったまま) */
	const handleCheckbox = () => {
		onselect?.({ toggle: true, range: false });
	};

	/**
	 * 右クリックでブラウザのメニューの代わりにコンテキストメニューを開く
	 * @param event - マウスイベント
	 */
	const handleContextMenu = (event: MouseEvent) => {
		if (onopenmenu === undefined) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		onopenmenu({ x: event.clientX, y: event.clientY });
	};

	/**
	 * ドラッグ開始を通知する
	 * @param event - ドラッグイベント
	 */
	const handleDragStart = (event: DragEvent) => {
		if (event.dataTransfer !== null) {
			event.dataTransfer.setData('text/plain', name);
			event.dataTransfer.effectAllowed = 'move';
		}
		ondragstartitem?.();
	};

	/** ドラッグ終了を通知する */
	const handleDragEnd = () => {
		ondragenditem?.();
	};

	/**
	 * 受け入れられる種類のドロップなら受け入れを表明して強調する
	 * @param event - ドラッグイベント
	 */
	const handleDragOver = (event: DragEvent) => {
		dropover = acceptDragOver(event, {
			items: ondropitems !== undefined,
			files: ondropfiles !== undefined,
		});
	};

	/** ドロップ対象の強調を解除する */
	const handleDragLeave = () => {
		dropover = false;
	};

	/**
	 * ドロップされた項目またはOSファイルを受け取る
	 * @param event - ドラッグイベント
	 */
	const handleDrop = (event: DragEvent) => {
		dropover = false;
		dispatchDrop(event, { onitems: ondropitems, onfiles: ondropfiles });
	};
</script>

<div data-selectmode={selectMode}>
	<button
		type="button"
		draggable={dragEnabled}
		onclick={handleClick}
		ondblclick={handleDblClick}
		oncontextmenu={handleContextMenu}
		ondragstart={handleDragStart}
		ondragend={handleDragEnd}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		use:longPress={touch ? handleLongPress : undefined}
		title={name}
		data-selected={showSelected}
		data-dropover={dropover}
		aria-pressed={showSelected}
	>
		<span>
			{#if thumbnailUrl !== null}
				<img src={thumbnailUrl} alt="" loading="lazy" />
			{:else}
				<FileTypeIcon {folder} {mimeType} size={30} />
			{/if}
		</span>
		<span>{name}</span>
	</button>
	{#if !touch || selectMode}
		<span class="check" data-checked={selected} transition:fade={{ duration: 250 }}>
			<CheckboxControl checked={selected} label="{name}を選択" size={16} ontoggle={handleCheckbox} />
		</span>
	{/if}
</div>

<style>
	button {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 0;
		background-color: var(--color-surface);
		font-family: inherit;
		cursor: pointer;
		inline-size: 100%;
		/* 長い名前でもカードの幅を広げない(省略記号で切る) */
		min-width: 0;
		user-select: none;
		transition:
			background-color 250ms ease,
			border-color 250ms ease;
	}

	button:hover {
		border-color: var(--color-outline);
		background-color: var(--color-surface-hover);
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	button[data-selected='true'] {
		border-color: var(--color-accent);
		background-color: var(--color-surface-active);
	}

	button[data-dropover='true'] {
		border-color: var(--color-accent);
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}

	button > span:first-child {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 10px 10px 0 0;
		background-color: var(--color-surface-active);
		aspect-ratio: 4 / 3;
		inline-size: 100%;
		color: var(--color-text-muted);
	}

	img {
		aspect-ratio: 4 / 3;
		object-fit: cover;
		inline-size: 100%;
	}

	button > span:last-child {
		overflow: hidden;
		padding: 8px 10px;
		font-size: 0.85rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
		max-width: 100%;
	}

	div {
		display: flex;
		flex: 1;
		position: relative;
		min-width: 0;
	}

	/* チェックボックスはカードの左上に重ね、ホバー・選択中・選択モード中だけ表示する */
	.check {
		display: inline-flex;
		position: absolute;
		top: 8px;
		left: 8px;
		z-index: 1;
		opacity: 0;
		transition: opacity 250ms ease;
	}

	div:hover > .check,
	.check[data-checked='true'],
	.check:focus-within,
	div[data-selectmode='true'] > .check {
		opacity: 1;
	}
</style>
